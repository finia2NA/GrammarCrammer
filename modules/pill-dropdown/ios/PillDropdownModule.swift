import ExpoModulesCore

public class PillDropdownModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PillDropdown")

    View(PillDropdownView.self) {
      Events("onValueChange")

      Prop("label") { (view: PillDropdownView, label: String) in
        view.updateLabel(label)
      }

      Prop("options") { (view: PillDropdownView, options: [String]) in
        view.updateOptions(options)
      }

      Prop("selectedIndex") { (view: PillDropdownView, index: Int) in
        view.updateSelectedIndex(index)
      }
    }
  }
}
