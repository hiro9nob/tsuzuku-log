Pod::Spec.new do |s|
  s.name           = 'OngoICloud'
  s.version        = '1.0.0'
  s.summary        = 'iCloud Drive backups for Ongo'
  s.author         = ''
  s.homepage       = 'https://ongo.no9.app'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
