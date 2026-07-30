Pod::Spec.new do |s|
  s.name           = 'GamerisenWidgetModule'
  s.version        = '1.0.0'
  s.summary        = 'Native iOS Widget Helper for Gamerisen'
  s.description    = 'Handles App Groups UserDefaults and WidgetKit updates.'
  s.author         = 'mfabey'
  s.homepage       = 'https://github.com/mfabey/gamepick'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.source_files   = '**/*.{h,m,swift}'
  s.requires_arc   = true

  s.dependency 'ExpoModulesCore'
end
