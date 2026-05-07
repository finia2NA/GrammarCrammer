import ExpoModulesCore
import UIKit

public class NativeDateTimePickerModule: Module {
  private var activePresenter: NativeDateTimePickerPresenter?

  public func definition() -> ModuleDefinition {
    Name("NativeDateTimePicker")

    AsyncFunction("present") { (options: [String: Any], promise: Promise) in
      DispatchQueue.main.async {
        if self.activePresenter != nil {
          promise.reject("ERR_PICKER_ALREADY_PRESENTED", "A date/time picker is already presented.")
          return
        }

        guard let presentingViewController = UIApplication.shared.pdTopViewController() else {
          promise.reject("ERR_NO_VIEW_CONTROLLER", "Could not find a view controller to present from.")
          return
        }

        guard let modeValue = options["mode"] as? String,
              let mode = NativeDateTimePickerMode(rawValue: modeValue),
              let value = options["value"] as? String,
              let date = ISO8601DateFormatter.pdPickerFormatter.date(from: value) else {
          promise.reject("ERR_INVALID_OPTIONS", "Invalid date/time picker options.")
          return
        }

        let title = options["title"] as? String ?? ""
        let cancelText = options["cancelText"] as? String ?? "Cancel"
        let confirmText = options["confirmText"] as? String ?? "Done"
        let is24Hour = options["is24Hour"] as? Bool ?? true
        let minuteInterval = options["minuteInterval"] as? Int ?? 1
        let accentColor = (options["accentColor"] as? String).flatMap(UIColor.pdFromHex)
        let foregroundColor = (options["foregroundColor"] as? String).flatMap(UIColor.pdFromHex)
        let sheetBackgroundColor = (options["sheetBackgroundColor"] as? String).flatMap(UIColor.pdFromHex)
        let panelBackgroundColor = (options["panelBackgroundColor"] as? String).flatMap(UIColor.pdFromHex)
        let resetText = options["resetText"] as? String
        let resetArmedText = options["resetArmedText"] as? String
        let resetTextColor = (options["resetTextColor"] as? String).flatMap(UIColor.pdFromHex)

        let presenter = NativeDateTimePickerPresenter(
          mode: mode,
          date: date,
          title: title,
          cancelText: cancelText,
          confirmText: confirmText,
          is24Hour: is24Hour,
          minuteInterval: minuteInterval,
          accentColor: accentColor,
          foregroundColor: foregroundColor,
          sheetBackgroundColor: sheetBackgroundColor,
          panelBackgroundColor: panelBackgroundColor,
          resetText: resetText,
          resetArmedText: resetArmedText,
          resetTextColor: resetTextColor
        ) { result in
          self.activePresenter = nil
          promise.resolve(result)
        }

        self.activePresenter = presenter
        presenter.present(from: presentingViewController)
      }
    }

    AsyncFunction("updateAppearance") { (options: [String: Any]) in
      DispatchQueue.main.async {
        self.activePresenter?.updateAppearance(from: options)
      }
    }
  }
}

private enum NativeDateTimePickerMode: String {
  case date
  case time
}

private final class NativeDateTimePickerPresenter: NSObject, UIAdaptivePresentationControllerDelegate {
  private let viewController: NativeDateTimePickerViewController
  private let completion: ([String: Any]) -> Void
  private var didComplete = false

  init(
    mode: NativeDateTimePickerMode,
    date: Date,
    title: String,
    cancelText: String,
    confirmText: String,
    is24Hour: Bool,
    minuteInterval: Int,
    accentColor: UIColor?,
    foregroundColor: UIColor?,
    sheetBackgroundColor: UIColor?,
    panelBackgroundColor: UIColor?,
    resetText: String?,
    resetArmedText: String?,
    resetTextColor: UIColor?,
    completion: @escaping ([String: Any]) -> Void
  ) {
    self.completion = completion
    self.viewController = NativeDateTimePickerViewController(
      mode: mode,
      date: date,
      title: title,
      cancelText: cancelText,
      confirmText: confirmText,
      is24Hour: is24Hour,
      minuteInterval: minuteInterval,
      accentColor: accentColor,
      foregroundColor: foregroundColor,
      sheetBackgroundColor: sheetBackgroundColor,
      panelBackgroundColor: panelBackgroundColor,
      resetText: resetText,
      resetArmedText: resetArmedText,
      resetTextColor: resetTextColor
    )
    super.init()
    viewController.onCancel = { [weak self] in self?.finish(action: "cancelled", date: nil) }
    viewController.onConfirm = { [weak self] date in self?.finish(action: "confirmed", date: date) }
    viewController.onReset = { [weak self] in self?.finish(action: "reset", date: nil) }
  }

  func present(from presentingViewController: UIViewController) {
    viewController.modalPresentationStyle = .pageSheet
    viewController.presentationController?.delegate = self
    if let sheet = viewController.sheetPresentationController {
      if #available(iOS 16.0, *) {
        let height: CGFloat = viewController.pickerMode == .date ? 575 : 335
        sheet.detents = [
          .custom(identifier: .init("patterndeckPicker")) { context in
            min(height, context.maximumDetentValue)
          }
        ]
      } else {
        sheet.detents = [.medium()]
      }
      sheet.prefersGrabberVisible = true
      sheet.prefersScrollingExpandsWhenScrolledToEdge = false
      sheet.preferredCornerRadius = 28
    }
    presentingViewController.present(viewController, animated: true)
  }

  func updateAppearance(from options: [String: Any]) {
    viewController.updateAppearance(from: options)
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    finish(action: "dismissed", date: nil, shouldDismiss: false)
  }

  private func finish(action: String, date: Date?, shouldDismiss: Bool = true) {
    guard !didComplete else { return }
    didComplete = true

    let result: [String: Any]
    if let date {
      result = [
        "action": action,
        "value": ISO8601DateFormatter.pdPickerFormatter.string(from: date)
      ]
    } else {
      result = ["action": action]
    }

    if shouldDismiss {
      viewController.dismiss(animated: true) { [completion] in completion(result) }
    } else {
      completion(result)
    }
  }
}

private final class NativeDateTimePickerViewController: UIViewController {
  let pickerMode: NativeDateTimePickerMode
  var onCancel: (() -> Void)?
  var onConfirm: ((Date) -> Void)?
  var onReset: (() -> Void)?

  private let initialDate: Date
  private let titleText: String
  private let cancelText: String
  private let confirmText: String
  private let is24Hour: Bool
  private let minuteInterval: Int
  private var accentColor: UIColor?
  private var foregroundColor: UIColor?
  private var sheetBackgroundColor: UIColor?
  private var panelBackgroundColor: UIColor?
  private let resetText: String?
  private let resetArmedText: String?
  private let resetTextColor: UIColor?
  private let picker = UIDatePicker()
  private var resetButton: UIButton?
  private var resetArmed = false
  private var resetTimer: Timer?
  private var veilView: UIView?
  private var headerCancelButton: UIButton?
  private var headerConfirmButton: UIButton?

  init(
    mode: NativeDateTimePickerMode,
    date: Date,
    title: String,
    cancelText: String,
    confirmText: String,
    is24Hour: Bool,
    minuteInterval: Int,
    accentColor: UIColor?,
    foregroundColor: UIColor?,
    sheetBackgroundColor: UIColor?,
    panelBackgroundColor: UIColor?,
    resetText: String?,
    resetArmedText: String?,
    resetTextColor: UIColor?
  ) {
    self.pickerMode = mode
    self.initialDate = date
    self.titleText = title
    self.cancelText = cancelText
    self.confirmText = confirmText
    self.is24Hour = is24Hour
    self.minuteInterval = min(max(minuteInterval, 1), 30)
    self.accentColor = accentColor
    self.foregroundColor = foregroundColor
    self.sheetBackgroundColor = sheetBackgroundColor
    self.panelBackgroundColor = panelBackgroundColor
    self.resetText = resetText
    self.resetArmedText = resetArmedText
    self.resetTextColor = resetTextColor
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.isOpaque = false
    view.backgroundColor = .clear
    installGlassBackground()
    configurePicker()
    buildLayout()
  }

  private func installGlassBackground() {
    let blurView = UIVisualEffectView(effect: UIBlurEffect(style: .systemChromeMaterial))
    blurView.translatesAutoresizingMaskIntoConstraints = false
    blurView.isUserInteractionEnabled = false

    let veilView = UIView()
    veilView.translatesAutoresizingMaskIntoConstraints = false
    veilView.isUserInteractionEnabled = false
    veilView.backgroundColor = UIColor.pdPickerSheetFill(sheetBackgroundColor)

    view.addSubview(blurView)
    view.addSubview(veilView)

    self.veilView = veilView

    NSLayoutConstraint.activate([
      blurView.topAnchor.constraint(equalTo: view.topAnchor),
      blurView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      blurView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      blurView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      veilView.topAnchor.constraint(equalTo: view.topAnchor),
      veilView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      veilView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      veilView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
    ])
  }

  private func configurePicker() {
    picker.date = initialDate
    picker.tintColor = accentColor
    picker.minuteInterval = minuteInterval
    picker.preferredDatePickerStyle = pickerMode == .date ? .inline : .wheels
    picker.datePickerMode = pickerMode == .date ? .date : .time
    picker.backgroundColor = UIColor.pdPickerPanelFill(panelBackgroundColor)
    picker.layer.cornerRadius = 18
    picker.layer.masksToBounds = true

    if pickerMode == .time && is24Hour {
      picker.locale = Locale(identifier: "en_GB")
    }
  }

  private func buildLayout() {
    let header = UIView()
    header.translatesAutoresizingMaskIntoConstraints = false

    let titleLabel = UILabel()
    titleLabel.translatesAutoresizingMaskIntoConstraints = false
    titleLabel.text = titleText
    titleLabel.font = .preferredFont(forTextStyle: .headline)
    titleLabel.adjustsFontForContentSizeCategory = true
    titleLabel.textAlignment = .center
    titleLabel.numberOfLines = 1

    let cancelButton = makeHeaderButton(
      systemName: "xmark",
      accessibilityLabel: cancelText,
      foregroundColor: foregroundColor ?? accentColor ?? .label,
      backgroundColor: UIColor.pdPickerButtonFill
    )
    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.addTarget(self, action: #selector(cancelPressed), for: .touchUpInside)
    self.headerCancelButton = cancelButton

    let confirmButton = makeHeaderButton(
      systemName: "checkmark",
      accessibilityLabel: confirmText,
      foregroundColor: foregroundColor ?? accentColor ?? .label,
      backgroundColor: accentColor ?? .label
    )
    confirmButton.translatesAutoresizingMaskIntoConstraints = false
    confirmButton.addTarget(self, action: #selector(confirmPressed), for: .touchUpInside)
    self.headerConfirmButton = confirmButton
    self.headerConfirmButton = confirmButton

    picker.translatesAutoresizingMaskIntoConstraints = false
    let resetButton = makeResetButton()

    view.addSubview(header)
    header.addSubview(cancelButton)
    header.addSubview(titleLabel)
    header.addSubview(confirmButton)
    view.addSubview(picker)
    if let resetButton {
      view.addSubview(resetButton)
    }

    let pickerHeight: CGFloat = pickerMode == .date ? 420 : 220
    let resetTopAnchor = resetButton?.topAnchor.constraint(equalTo: picker.bottomAnchor, constant: 8)
    let resetCenterAnchor = resetButton?.centerXAnchor.constraint(equalTo: view.centerXAnchor)
    let resetLeadingAnchor = resetButton?.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24)
    let resetTrailingAnchor = resetButton?.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24)
    let resetHeightAnchor = resetButton?.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)

    var constraints = [
      header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
      header.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      header.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      header.heightAnchor.constraint(equalToConstant: 64),

      cancelButton.leadingAnchor.constraint(equalTo: header.leadingAnchor, constant: 20),
      cancelButton.centerYAnchor.constraint(equalTo: header.centerYAnchor, constant: 4),
      cancelButton.widthAnchor.constraint(equalToConstant: 48),
      cancelButton.heightAnchor.constraint(equalToConstant: 48),

      confirmButton.trailingAnchor.constraint(equalTo: header.trailingAnchor, constant: -20),
      confirmButton.centerYAnchor.constraint(equalTo: header.centerYAnchor, constant: 4),
      confirmButton.widthAnchor.constraint(equalToConstant: 48),
      confirmButton.heightAnchor.constraint(equalToConstant: 48),

      titleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: cancelButton.trailingAnchor, constant: 12),
      titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: confirmButton.leadingAnchor, constant: -12),
      titleLabel.centerXAnchor.constraint(equalTo: header.centerXAnchor),
      titleLabel.centerYAnchor.constraint(equalTo: header.centerYAnchor, constant: 4),

      picker.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 12),
      picker.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      picker.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      picker.heightAnchor.constraint(equalToConstant: pickerHeight)
    ]

    if let resetTopAnchor, let resetCenterAnchor, let resetLeadingAnchor, let resetTrailingAnchor, let resetHeightAnchor {
      constraints.append(contentsOf: [resetTopAnchor, resetCenterAnchor, resetLeadingAnchor, resetTrailingAnchor, resetHeightAnchor])
    }

    NSLayoutConstraint.activate(constraints)
  }

  private func makeResetButton() -> UIButton? {
    guard pickerMode == .date, let resetText, !resetText.isEmpty else {
      return nil
    }

    let button = UIButton(type: .system)
    button.translatesAutoresizingMaskIntoConstraints = false
    let color = resetTextColor ?? .systemRed

    if #available(iOS 15.0, *) {
      var configuration = UIButton.Configuration.tinted()
      configuration.title = resetText
      configuration.baseForegroundColor = color
      configuration.baseBackgroundColor = color
      configuration.cornerStyle = .capsule
      configuration.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 22, bottom: 10, trailing: 22)
      button.configuration = configuration
    } else {
      button.setTitle(resetText, for: .normal)
      button.contentEdgeInsets = UIEdgeInsets(top: 10, left: 22, bottom: 10, right: 22)
      button.backgroundColor = color.withAlphaComponent(0.16)
      button.tintColor = color
      button.layer.cornerRadius = 18
    }

    button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    button.layer.borderColor = color.withAlphaComponent(0.8).cgColor
    button.layer.borderWidth = 1
    button.layer.cornerCurve = .continuous
    button.addTarget(self, action: #selector(resetPressed), for: .touchUpInside)
    self.resetButton = button
    return button
  }

  private func makeHeaderButton(
    systemName: String,
    accessibilityLabel: String,
    foregroundColor: UIColor,
    backgroundColor: UIColor
  ) -> UIButton {
    let button = UIButton(type: .system)

    if #available(iOS 26.0, *) {
      var configuration = UIButton.Configuration.prominentGlass()
      configuration.image = UIImage(systemName: systemName)?.withConfiguration(
        UIImage.SymbolConfiguration(pointSize: 16, weight: .semibold)
      )
      configuration.baseForegroundColor = foregroundColor
      configuration.baseBackgroundColor = backgroundColor
      configuration.cornerStyle = .capsule
      configuration.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 14, bottom: 14, trailing: 14)
      button.configuration = configuration
    } else if #available(iOS 15.0, *) {
      var configuration = UIButton.Configuration.filled()
      configuration.image = UIImage(systemName: systemName)
      configuration.baseForegroundColor = foregroundColor
      configuration.baseBackgroundColor = backgroundColor
      configuration.cornerStyle = .capsule
      configuration.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
      button.configuration = configuration
    } else {
      button.setImage(UIImage(systemName: systemName), for: .normal)
      button.tintColor = foregroundColor
      button.backgroundColor = backgroundColor
      button.layer.cornerRadius = 18
    }

    button.accessibilityLabel = accessibilityLabel
    if #unavailable(iOS 26.0) {
      button.layer.borderColor = UIColor.pdPickerButtonBorder.cgColor
      button.layer.borderWidth = 1
    }
    button.layer.cornerCurve = .continuous
    return button
  }

  @objc private func cancelPressed() {
    onCancel?()
  }

  @objc private func confirmPressed() {
    onConfirm?(picker.date)
  }

  func updateAppearance(from options: [String: Any]) {
    if let accent = (options["accentColor"] as? String).flatMap(UIColor.pdFromHex) {
      accentColor = accent
      picker.tintColor = accent
    }
    if let foreground = (options["foregroundColor"] as? String).flatMap(UIColor.pdFromHex) {
      foregroundColor = foreground
    }
    if let sheet = (options["sheetBackgroundColor"] as? String).flatMap(UIColor.pdFromHex) {
      sheetBackgroundColor = sheet
      veilView?.backgroundColor = UIColor.pdPickerSheetFill(sheetBackgroundColor)
    }
    if let panel = (options["panelBackgroundColor"] as? String).flatMap(UIColor.pdFromHex) {
      panelBackgroundColor = panel
      picker.backgroundColor = UIColor.pdPickerPanelFill(panelBackgroundColor)
    }

    let resolvedFG = foregroundColor ?? accentColor ?? .label
    headerCancelButton?.configuration?.baseForegroundColor = resolvedFG
    headerConfirmButton?.configuration?.baseForegroundColor = resolvedFG
    headerConfirmButton?.configuration?.baseBackgroundColor = accentColor ?? .label
  }

  @objc private func resetPressed() {
    if resetArmed {
      resetTimer?.invalidate()
      resetTimer = nil
      resetArmed = false
      onReset?()
    } else {
      resetArmed = true
      let armedText = resetArmedText ?? resetText ?? ""
      resetButton?.setTitle(armedText, for: .normal)
      resetTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
        self?.resetArmed = false
        let normalText = self?.resetText ?? ""
        self?.resetButton?.setTitle(normalText, for: .normal)
      }
    }
  }
}

private extension ISO8601DateFormatter {
  static let pdPickerFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()
}

private extension UIColor {
  static func pdPickerSheetFill(_ color: UIColor?) -> UIColor {
    UIColor { traits in
      let fallback = traits.userInterfaceStyle == .dark
        ? UIColor(red: 20 / 255, green: 21 / 255, blue: 23 / 255, alpha: 1)
        : UIColor(red: 253 / 255, green: 240 / 255, blue: 224 / 255, alpha: 1)
      return (color ?? fallback).withAlphaComponent(traits.userInterfaceStyle == .dark ? 0.90 : 0.88)
    }
  }

  static func pdPickerPanelFill(_ color: UIColor?) -> UIColor {
    UIColor { traits in
      let fallback = traits.userInterfaceStyle == .dark
        ? UIColor(red: 27 / 255, green: 29 / 255, blue: 33 / 255, alpha: 1)
        : UIColor(red: 255 / 255, green: 250 / 255, blue: 244 / 255, alpha: 1)
      return (color ?? fallback).withAlphaComponent(traits.userInterfaceStyle == .dark ? 0.82 : 0.78)
    }
  }

  static var pdPickerButtonFill: UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(white: 1.0, alpha: 0.11)
        : UIColor(white: 0.0, alpha: 0.08)
    }
  }

  static var pdPickerButtonBorder: UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(white: 1.0, alpha: 0.18)
        : UIColor(white: 0.0, alpha: 0.12)
    }
  }

  static func pdFromHex(_ hex: String) -> UIColor? {
    var cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if cleaned.hasPrefix("#") {
      cleaned.removeFirst()
    }

    guard cleaned.count == 6 || cleaned.count == 8,
          let value = UInt64(cleaned, radix: 16) else {
      return nil
    }

    let red: CGFloat
    let green: CGFloat
    let blue: CGFloat
    let alpha: CGFloat

    if cleaned.count == 8 {
      red = CGFloat((value & 0xFF000000) >> 24) / 255
      green = CGFloat((value & 0x00FF0000) >> 16) / 255
      blue = CGFloat((value & 0x0000FF00) >> 8) / 255
      alpha = CGFloat(value & 0x000000FF) / 255
    } else {
      red = CGFloat((value & 0xFF0000) >> 16) / 255
      green = CGFloat((value & 0x00FF00) >> 8) / 255
      blue = CGFloat(value & 0x0000FF) / 255
      alpha = 1
    }

    return UIColor(red: red, green: green, blue: blue, alpha: alpha)
  }
}

private extension UIApplication {
  func pdTopViewController(
    base: UIViewController? = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first { $0.isKeyWindow }?
      .rootViewController
  ) -> UIViewController? {
    if let navigationController = base as? UINavigationController {
      return pdTopViewController(base: navigationController.visibleViewController)
    }

    if let tabBarController = base as? UITabBarController,
       let selectedViewController = tabBarController.selectedViewController {
      return pdTopViewController(base: selectedViewController)
    }

    if let presentedViewController = base?.presentedViewController {
      return pdTopViewController(base: presentedViewController)
    }

    return base
  }
}
