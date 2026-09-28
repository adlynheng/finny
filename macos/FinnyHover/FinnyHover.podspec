# Finny's macOS pointer tracking: a React Native view that reports where the
# mouse is inside it. react-native-macos only reports enter and leave.
Pod::Spec.new do |s|
  s.name         = 'FinnyHover'
  s.version      = '0.0.1'
  s.summary      = 'Mouse-moved tracking as a React Native view, for chart hover on macOS.'
  s.homepage     = 'https://github.com/adlynheng/finny'
  s.license      = 'UNLICENSED'
  s.author       = 'Finny'
  s.platforms    = { :osx => '14.0' }
  s.source       = { :path => '.' }
  s.source_files = '*.{h,m}'
  s.dependency 'React-Core'
end
