import ExpoModulesCore

public class PlatformButtonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PlatformButton")

    View(PlatformButtonView.self) {
      Events("onButtonPress")

      Prop("text") { (view: PlatformButtonView, text: String?) in
        view.updateText(text)
      }

      Prop("symbolName") { (view: PlatformButtonView, symbolName: String?) in
        view.updateSymbolName(symbolName)
      }

      Prop("variant") { (view: PlatformButtonView, variant: String?) in
        view.updateVariant(variant)
      }

      Prop("disabled") { (view: PlatformButtonView, disabled: Bool?) in
        view.updateDisabled(disabled ?? false)
      }

      Prop("foregroundColor") { (view: PlatformButtonView, hex: String?) in
        view.updateForegroundColor(hex)
      }

      Prop("backgroundColor") { (view: PlatformButtonView, hex: String?) in
        view.updateBackgroundColor(hex)
      }

      Prop("disabledForegroundColor") { (view: PlatformButtonView, hex: String?) in
        view.updateDisabledForegroundColor(hex)
      }

      Prop("fontSize") { (view: PlatformButtonView, fontSize: Double?) in
        view.updateFontSize(fontSize)
      }

      Prop("fontWeight") { (view: PlatformButtonView, fontWeight: String?) in
        view.updateFontWeight(fontWeight)
      }

      Prop("horizontalPadding") { (view: PlatformButtonView, padding: Double?) in
        view.updateHorizontalPadding(padding)
      }

      Prop("verticalPadding") { (view: PlatformButtonView, padding: Double?) in
        view.updateVerticalPadding(padding)
      }

      Prop("iconPointSize") { (view: PlatformButtonView, iconPointSize: Double?) in
        view.updateIconPointSize(iconPointSize)
      }

      Prop("cornerRadius") { (view: PlatformButtonView, cornerRadius: Double?) in
        view.updateCornerRadius(cornerRadius)
      }

      Prop("contentAlignment") { (view: PlatformButtonView, alignment: String?) in
        view.updateContentAlignment(alignment)
      }

      Prop("accessibilityLabel") { (view: PlatformButtonView, label: String?) in
        view.updateAccessibilityLabel(label)
      }
    }
  }
}
