require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'pill-dropdown'
  s.version        = package['version']
  s.summary        = 'Native pill dropdown menu using UIButton + UIMenu'
  s.homepage       = 'https://github.com/example'
  s.license        = { :type => 'MIT' }
  s.author         = 'GrammarCrammer'
  s.platform       = :ios, '15.1'
  s.source         = { :path => '.' }
  s.source_files   = 'ios/**/*.swift'
  s.dependency 'ExpoModulesCore'
  s.swift_version  = '5.4'
end
