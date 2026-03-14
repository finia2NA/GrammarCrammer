import ExpoModulesCore
import UIKit

class PillDropdownView: ExpoView {
  let onValueChange = EventDispatcher()

  private var options: [String] = []
  private var selectedIndex: Int = 0
  private var label: String = ""

  // Defaults match dark theme input/foreground tokens
  private static let defaultBackground = UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
  private static let defaultForeground = UIColor.white

  private lazy var button: UIButton = {
    var config = UIButton.Configuration.filled()
    config.baseBackgroundColor = Self.defaultBackground
    config.baseForegroundColor = Self.defaultForeground
    config.background.cornerRadius = 8
    config.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 12)
    config.imagePadding = 4
    config.imagePlacement = .trailing
    config.image = UIImage(
      systemName: "chevron.down",
      withConfiguration: UIImage.SymbolConfiguration(scale: .small)
    )
    let btn = UIButton(configuration: config)
    btn.showsMenuAsPrimaryAction = true
    btn.translatesAutoresizingMaskIntoConstraints = false
    return btn
  }()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = false
    addSubview(button)
    NSLayoutConstraint.activate([
      button.topAnchor.constraint(equalTo: topAnchor),
      button.leadingAnchor.constraint(equalTo: leadingAnchor),
      button.trailingAnchor.constraint(equalTo: trailingAnchor),
      button.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  override var intrinsicContentSize: CGSize { button.intrinsicContentSize }

  func updateLabel(_ label: String) {
    self.label = label
    refreshTitle()
  }

  func updateOptions(_ options: [String]) {
    self.options = options
    refreshMenu()
  }

  func updateSelectedIndex(_ index: Int) {
    self.selectedIndex = index
    refreshMenu()
  }

  func updateBackgroundColor(_ hex: String) {
    guard var config = button.configuration else { return }
    config.baseBackgroundColor = UIColor(hex: hex) ?? Self.defaultBackground
    button.configuration = config
  }

  func updateForegroundColor(_ hex: String) {
    guard var config = button.configuration else { return }
    config.baseForegroundColor = UIColor(hex: hex) ?? Self.defaultForeground
    button.configuration = config
    refreshTitle()
  }

  private func refreshTitle() {
    guard var config = button.configuration else { return }
    var attr = AttributedString(label)
    attr.font = UIFont.systemFont(ofSize: 14, weight: .medium)
    config.attributedTitle = attr
    button.configuration = config
  }

  private func refreshMenu() {
    let actions = options.enumerated().map { (index, option) -> UIAction in
      let state: UIMenuElement.State = (index == selectedIndex) ? .on : .off
      return UIAction(title: option, state: state) { [weak self] _ in
        self?.onValueChange(["index": index])
      }
    }
    button.menu = UIMenu(children: actions)
  }
}

private extension UIColor {
  convenience init?(hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s = String(s.dropFirst()) }
    var rgb: UInt64 = 0
    guard s.count == 6, Scanner(string: s).scanHexInt64(&rgb) else { return nil }
    self.init(
      red:   CGFloat((rgb & 0xFF0000) >> 16) / 255,
      green: CGFloat((rgb & 0x00FF00) >>  8) / 255,
      blue:  CGFloat( rgb & 0x0000FF       ) / 255,
      alpha: 1
    )
  }
}
