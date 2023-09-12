## Open Source and Test Files Side by Side

With this extension, you can now easily open your source code and test files side by side for efficient development and testing.

### Usage

To open source and test files side by side, follow these steps:

1. Open the source file you want to work on.
2. Invoke the command palette by pressing `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS).
3. Search for and select the `Switch: Open Source and Test Files Side by Side` command.

   ![Switch Command](images/switch-command.png)

4. The extension will automatically locate the corresponding test file based on your configuration and open it alongside your source file.

Now you can easily switch between your source and test files to streamline your development and testing workflow!

### Configuration

You can customize the behavior of this functionality by adjusting the extension's settings in your `settings.json` file. Here are some of the key settings you can configure:

- `switch.sourcePath`: The path to the source files.
- `switch.testPath`: The path to the test files.
- `switch.sourceFilePattern`: The extension pattern for source files.
- `switch.testFilePattern`: The extension pattern for test files.

Make sure to check the [Extension Settings](#extension-settings) section for more details on configuring these settings.

![Switch Settings](images/switch-settings.png)

### Extension Settings

You can configure the extension's behavior by adding the following settings to your `settings.json` file:

```json
"switch.sourcePath": {
  "type": "string",
  "default": "src/",
  "description": "The path to the source files."
},
"switch.testPath": {
  "type": "string",
  "default": "test/",
  "description": "The path to the test files."
},
"switch.sourceFilePattern": {
  "type": "string",
  "default": "{baseName}.ts",
  "description": "The extension of the source files."
},
"switch.testFilePattern": {
  "type": "string",
  "default": "{baseName}.spec.ts",
  "description": "The extension of the test files."
}
