const { withXcodeProject, withEntitlementsPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ── App Group Entegrasyonu (Main App Entitlements) ──
function withMainAppEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = ['group.com.gamerisen.app'];
    return config;
  });
}

// ── Xcode Proje Modifikasyonu (Target Ekleme) ──
function withIosWidgetExtension(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const pbxprojPath = project.filepath;
    const projectRoot = config.modRequest.projectRoot;
    
    const targetName = 'GamerisenWidget';
    const widgetSourceDir = path.join(projectRoot, 'plugins', 'ios-widget');
    const widgetTargetDir = path.join(projectRoot, 'ios', targetName);

    // 1. Hedef klasörü oluştur
    if (!fs.existsSync(widgetTargetDir)) {
      fs.mkdirSync(widgetTargetDir, { recursive: true });
    }

    // 2. SwiftUI kodunu kopyala
    const swiftSrc = path.join(widgetSourceDir, 'GamerisenWidget.swift');
    const swiftDest = path.join(widgetTargetDir, 'GamerisenWidget.swift');
    if (fs.existsSync(swiftSrc)) {
      fs.copyFileSync(swiftSrc, swiftDest);
    }

    // 3. Info.plist ve Entitlements dosyalarını oluştur
    //
    // CFBundle* anahtarları ŞART. Bunlar olmadan derlenen .appex'in
    // CFBundleIdentifier'ı boş kalıyor ve Xcode'un ValidateEmbeddedBinary adımı
    // "Embedded binary's bundle identifier is not prefixed with the parent app's
    // bundle identifier / Embedded Binary Bundle Identifier: (null)" hatası veriyor.
    //
    // Sürüm değerleri, Expo'nun ana uygulama için kullandığı mantığın birebir
    // aynısıyla türetiliyor (@expo/config-plugins ios/Version.js) — böylece
    // uzantı ile ana uygulamanın sürümü hiçbir koşulda ayrışamaz. App Store
    // yüklemesinde uzantının CFBundleVersion/CFBundleShortVersionString değerleri
    // ana uygulamayla aynı olmak zorunda.
    const appVersion = config.ios?.version || config.version || '1.0.0';
    const appBuildNumber = config.ios?.buildNumber ? config.ios.buildNumber : '1';

    const plistDest = path.join(widgetTargetDir, 'Info.plist');
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>Gamerisen</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>XPC!</string>
	<key>CFBundleShortVersionString</key>
	<string>${appVersion}</string>
	<key>CFBundleVersion</key>
	<string>${appBuildNumber}</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>`;
    fs.writeFileSync(plistDest, plistContent);

    const entDest = path.join(widgetTargetDir, 'GamerisenWidget.entitlements');
    const entContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.com.gamerisen.app</string>
	</array>
</dict>
</plist>`;
    fs.writeFileSync(entDest, entContent);

    // 4. Xcode pbxproj projesine hedef olarak ekle
    // Zaten ekliyse mükerrer eklemeyi önle
    const targets = project.hash.project.objects.PBXNativeTarget;
    let targetExists = false;
    for (const key in targets) {
      if (typeof targets[key] === 'object' && (targets[key].name === `"${targetName}"` || targets[key].name === targetName)) {
        targetExists = true;
        break;
      }
    }
    if (targetExists) {
      return config;
    }

    const bundleId = `${config.ios?.bundleIdentifier || 'com.gamerisen.app'}.${targetName}`;
    
    // Önce Widget Extension target'ını oluştur ki UUID hazır olsun
    const target = project.addTarget(targetName, 'app_extension', targetName);
    const targetUuid = target.uuid;
    
    // Grubu oluştur ve dosyaları gruba ekle
    const groupName = targetName;
    const groupKey = project.pbxCreateGroup(groupName, targetName);
    
    // Info.plist ve entitlements: yalnızca dosya referansı yeterli (build phase'e
    // girmezler, build settings INFOPLIST_FILE/CODE_SIGN_ENTITLEMENTS ile yol
    // üzerinden referans verir).
    project.addFile('GamerisenWidget/Info.plist', groupKey);
    project.addFile('GamerisenWidget/GamerisenWidget.entitlements', groupKey);

    // Swift dosyası: addFile + addToPbxSourcesBuildPhase İKİLİSİNİ KULLANMIYORUZ.
    // addToPbxSourcesBuildPhase, dosyanın `.target` alanına bakıyor — ama addFile'a
    // verilen { target } seçeneği pbxFile tarafından hiç saklanmıyor (kaynaktan
    // doğrulandı). Sonuç: `.target` her zaman undefined kalıyor ve fonksiyon,
    // projedeki İLK bulduğu Sources fazına (ana uygulamanınkine) ekliyor — Swift
    // dosyası yanlış hedefte derlenmeye çalışılıyor (örn. @main çakışması).
    //
    // addBuildPhase(dosya_yolları, tip, yorum, hedef) tek başına hem dosya
    // referansını hem derleme kaydını oluşturup DOĞRUDAN verilen hedefe ekliyor
    // — kırık köprüye hiç ihtiyaç kalmıyor.
    project.addBuildPhase(
      ['GamerisenWidget/GamerisenWidget.swift'],
      'PBXSourcesBuildPhase',
      'Sources',
      targetUuid
    );

    // Target'ın kendi build configuration'larını güncelle (Tüm projeyi bozmadan!)
    const nativeTargets = project.pbxNativeTargetSection();
    const nativeTarget = nativeTargets[targetUuid];
    const buildConfigurationListKey = nativeTarget.buildConfigurationList;
    const xcConfigurationLists = project.pbxXCConfigurationList();
    const xcConfigurationList = xcConfigurationLists[buildConfigurationListKey];
    
    const buildConfigurations = xcConfigurationList.buildConfigurations;
    const xcBuildConfigs = project.pbxXCBuildConfigurationSection();

    for (const configRef of buildConfigurations) {
      const buildConfig = xcBuildConfigs[configRef.value];
      if (buildConfig && buildConfig.buildSettings) {
        buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
        buildConfig.buildSettings.INFOPLIST_FILE = `"${targetName}/Info.plist"`;
        buildConfig.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/GamerisenWidget.entitlements"`;
        buildConfig.buildSettings.SWIFT_VERSION = '"5.0"';
        buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"15.1"';
        buildConfig.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        // Ana uygulamayla aynı cihaz ailesi — app.json'da supportsTablet false
        // olduğu için ana uygulama yalnızca iPhone ("1"). Uzantının daha geniş
        // bir aile bildirmesi tutarsızlık yaratır.
        buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = config.ios?.supportsTablet ? '"1,2"' : '"1"';
      }
    }

    // Ana uygulama hedefine target dependency olarak ekle.
    // addTargetDependency(target, dependencyTargets) — 2. parametre bir DİZİ
    // bekliyor (kaynaktan doğrulandı: .length ve [index] ile geziniyor). Bare
    // string verilirse JS'in string-index davranışı yüzünden karakter karakter
    // geziyor ve "Invalid target: <tek karakter>" hatasıyla patlıyor.
    const appTargetUuid = project.getFirstTarget().uuid;
    project.addTargetDependency(appTargetUuid, [targetUuid]);

    return config;
  });
}

// ── Ana Plugin İhracatı ──
module.exports = function withIosWidget(config) {
  config = withMainAppEntitlements(config);
  config = withIosWidgetExtension(config);
  return config;
};
