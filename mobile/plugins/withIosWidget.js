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
    const plistDest = path.join(widgetTargetDir, 'Info.plist');
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
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
    if (project.pbxTargetByName(targetName)) {
      return config;
    }

    const bundleId = `${config.ios.bundleIdentifier}.${targetName}`;
    const targetUuid = project.generateUuid();
    
    // Grubu oluştur ve dosyaları gruba ekle
    const groupName = targetName;
    const groupKey = project.pbxCreateGroup(groupName, targetName);
    
    const fileSwift = project.addFile('GamerisenWidget.swift', groupKey, { target: targetUuid });
    const filePlist = project.addFile('Info.plist', groupKey);
    const fileEnt = project.addFile('GamerisenWidget.entitlements', groupKey);

    // Build phases (kaynak derleme aşaması)
    const sourcesBuildPhase = project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid);
    project.addToPbxSourcesBuildPhase(fileSwift, targetUuid);

    // Widget Extension target'ını oluştur
    const target = project.addTarget(targetName, 'app_extension', targetUuid);
    
    // Target build configurations (Ayarlar)
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const config = configurations[key];
      if (typeof config === 'object' && config.buildSettings) {
        if (config.name === 'Release' || config.name === 'Debug') {
          config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = bundleId;
          config.buildSettings.INFOPLIST_FILE = `${targetName}/Info.plist`;
          config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${targetName}/GamerisenWidget.entitlements`;
          config.buildSettings.SWIFT_VERSION = '5.0';
          config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '15.1';
        }
      }
    }

    // Ana uygulama hedefine target dependency olarak ekle
    const appTargetUuid = project.getFirstTarget().uuid;
    project.addTargetDependency(appTargetUuid, target.uuid);

    return config;
  });
}

// ── Ana Plugin İhracatı ──
module.exports = function withIosWidget(config) {
  config = withMainAppEntitlements(config);
  config = withIosWidgetExtension(config);
  return config;
};
