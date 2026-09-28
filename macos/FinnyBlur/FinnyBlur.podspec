# Finny's macOS backdrop blur: a React Native view wrapping AppKit's
# NSVisualEffectView. expo-blur is iOS-only (Phase A spike report §2).
Pod::Spec.new do |s|
  s.name         = 'FinnyBlur'
  s.version      = '0.0.1'
  s.summary      = 'NSVisualEffectView as a React Native view, for Glass on macOS.'
  s.homepage     = 'https://github.com/adlynheng/finny'
  s.license      = 'UNLICENSED'
  s.author       = 'Finny'
  s.platforms    = { :osx => '14.0' }
  s.source       = { :path => '.' }
  s.source_files = '*.{h,m}'
  s.dependency 'React-Core'
end
