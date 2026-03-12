import ExpoModulesCore
import UIKit

class PillDropdownView: ExpoView {
  let onValueChange = EventDispatcher()

  private var options: [String] = []
  private var selectedIndex: Int = 0
  private var label: String = ""

  private lazy var button: UIButton = {
    var config = UIButton.Configuration.filled()
    // slate-800: #1e293b
    config.baseBackgroundColor = UIColor(red: 30/255.0, green: 41/255.0, blue: 59/255.0, alpha: 1)
    config.baseForegroundColor = .white
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
    overrideUserInterfaceStyle = .dark
    addSubview(button)
    NSLayoutConstraint.activate([
      button.topAnchor.constraint(equalTo: topAnchor),
      button.leadingAnchor.constraint(equalTo: leadingAnchor),
      button.trailingAnchor.constraint(equalTo: trailingAnchor),
      button.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  override var intrinsicContentSize: CGSize {
    return button.intrinsicContentSize
  }

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
