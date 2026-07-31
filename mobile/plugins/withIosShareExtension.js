const { withXcodeProject, withEntitlementsPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Ana uygulamanın App Group entitlement'ı zaten withIosWidget.js tarafından
// ekleniyor (aynı grup: group.com.gamerisen.app). Burada tekrar eklemiyoruz —
// yalnızca bu hedefin (Share Extension'ın) KENDİ entitlements dosyasını kuruyoruz.

function withIosShareExtensionTarget(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const projectRoot = config.modRequest.projectRoot;

    const targetName = 'GamerisenShare';
    const widgetSourceDir = path.join(projectRoot, 'plugins', 'ios-share-extension');
    const targetDir = path.join(projectRoot, 'ios', targetName);

    // 1. Hedef klasörü + kaynak dosyayı kopyala
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const swiftSrc = path.join(widgetSourceDir, 'ShareViewController.swift');
    const swiftDest = path.join(targetDir, 'ShareViewController.swift');
    if (fs.existsSync(swiftSrc)) {
      fs.copyFileSync(swiftSrc, swiftDest);
    }

    // 2. Info.plist — NSExtensionPrincipalClass ile storyboard'suz özel sınıf
    const plistDest = path.join(targetDir, 'Info.plist');
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.share-services</string>
		<key>NSExtensionPrincipalClass</key>
		<string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
		<key>NSExtensionAttributes</key>
		<dict>
			<key>NSExtensionActivationRule</key>
			<dict>
				<key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
				<integer>1</integer>
				<key>NSExtensionActivationSupportsWebPageWithMaxCount</key>
				<integer>1</integer>
			</dict>
		</dict>
	</dict>
</dict>
</plist>`;
    fs.writeFileSync(plistDest, plistContent);

    // 3. Entitlements — aynı App Group, widget ile paylaşılan veri kanalı
    const entDest = path.join(targetDir, 'GamerisenShare.entitlements');
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

    // 4. Mükerrer eklemeyi önle
    if (project.pbxTargetByName(targetName)) {
      return config;
    }

    const bundleId = `${config.ios?.bundleIdentifier || 'com.gamerisen.app'}.${targetName}`;

    // Hedefi oluştur — DÖNEN target.uuid GERÇEK uuid'dir, sonrasında hep bunu kullan.
    const target = project.addTarget(targetName, 'app_extension', targetName);
    const targetUuid = target.uuid;

    // Grup (yalnızca Info.plist + entitlements için — görünürlük amaçlı)
    const groupKey = project.pbxCreateGroup(targetName, targetName);
    project.addFile(`${targetName}/Info.plist`, groupKey);
    project.addFile(`${targetName}/GamerisenShare.entitlements`, groupKey);

    // Swift dosyası: addFile + addToPbxSourcesBuildPhase KULLANILMIYOR — o ikili,
    // dosyanın `.target` alanına bakıyor ama pbxFile bunu hiç saklamıyor, bu yüzden
    // widget'ta Swift kodu yanlış (veya hiçbir) hedefe ekleniyordu. addBuildPhase'e
    // dosya yolunu DOĞRUDAN vermek hem dosya referansını hem derleme kaydını
    // oluşturup GERÇEK hedefe ekliyor.
    project.addBuildPhase(
      [`${targetName}/ShareViewController.swift`],
      'PBXSourcesBuildPhase',
      'Sources',
      targetUuid
    );

    // Yalnızca BU HEDEFİN kendi build config'lerini bul — projedeki tüm
    // hedeflerin config'lerini DEĞİL (widget'taki asıl kırılma noktası buydu).
    const nativeTargets = project.pbxNativeTargetSection();
    const nativeTarget = nativeTargets[targetUuid];
    const configListUuid = nativeTarget.buildConfigurationList;
    const configList = project.pbxXCConfigurationList()[configListUuid];
    const ownConfigUuids = (configList?.buildConfigurations || []).map((c) => c.value);
    const allConfigs = project.pbxXCBuildConfigurationSection();

    for (const uuid of ownConfigUuids) {
      const cfg = allConfigs[uuid];
      if (cfg?.buildSettings) {
        cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleId}"`;
        cfg.buildSettings.INFOPLIST_FILE = `"${targetName}/Info.plist"`;
        cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${targetName}/GamerisenShare.entitlements"`;
        cfg.buildSettings.SWIFT_VERSION = '"5.0"';
        cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"15.1"';
        cfg.buildSettings.LD_RUNPATH_SEARCH_PATHS =
          '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        cfg.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
      }
    }

    // Ana uygulama hedefine bağımlılık olarak ekle.
    // addTargetDependency(target, dependencyTargets) — 2. parametre bir DİZİ
    // bekliyor (kaynaktan doğrulandı). Bare string verilirse JS'in string-index
    // davranışı yüzünden karakter karakter geziyor ve "Invalid target: <tek
    // karakter>" hatasıyla patlıyor — bu build'in tam olarak çöktüğü nokta.
    const appTargetUuid = project.getFirstTarget().uuid;
    project.addTargetDependency(appTargetUuid, [targetUuid]);

    return config;
  });
}

module.exports = function withIosShareExtension(config) {
  config = withIosShareExtensionTarget(config);
  return config;
};
