// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { basename } from 'path';
import * as vscode from 'vscode';

function separateFilePath(filePath: string): { workspacePath: string, folderPath: string, fileName: string } {
	const workspaceFolders = vscode.workspace.workspaceFolders;
  
	if (!workspaceFolders || workspaceFolders.length === 0) {
	  throw new Error('No workspace is open.');
	}
  
	const sortedFolders = Array.from(workspaceFolders).sort(
        (a, b) => b.uri.fsPath.length - a.uri.fsPath.length
    );

	const workspaceFolder = sortedFolders.find((folder) => filePath.startsWith(folder.uri.fsPath));
  
	if (workspaceFolder) {
	  // The file is inside the workspace folder
		const relativePath = vscode.workspace.asRelativePath(filePath, false);
		console.log(filePath);
		console.log(relativePath);
		console.log(workspaceFolder);
		const lastSlashIndex = relativePath.lastIndexOf('/');
		if (lastSlashIndex !== -1) {
			const folderPath = relativePath.substring(0, lastSlashIndex + 1);
			const fileName = relativePath.substring(lastSlashIndex + 1);
			
			return {
				workspacePath: workspaceFolder.uri.fsPath,
				folderPath,
				fileName,
			};
		}
	}
  
	throw new Error('The file is not inside any of the workspace folders.');
}

function calculateFitScore(regex: RegExp, input: string): number {
	const regexSource = regex.source.replace(/\\/g, '');;
	const match = input.match(regex);

	if (!match) {
		return 0; // No match, fit score is 0
	}

	const prefixIndex = regexSource.indexOf("(.*)");
	const suffixIndex = regexSource.lastIndexOf("(.*)");
	let prefixMatches = 0;
	let suffixMatches = 0;

	if (prefixIndex !== -1) {
		const prefix = regexSource.substring(0, prefixIndex);
		prefixMatches = input.startsWith(prefix) ? prefix.length : 0;
	}

	if (suffixIndex !== -1) {
		const suffix = regexSource.substring(suffixIndex + 4); // 4 characters for "(.*)"
		suffixMatches = input.endsWith(suffix) ? suffix.length : 0;
	}

	// Calculate fit score based on the combined length of prefix and suffix matches
	return prefixMatches + suffixMatches;
  }
  
  function chooseFileTypes(input: string, sourceFilePattern: RegExp, testFilePattern: RegExp): { isSourceFile: boolean, isTestFile: boolean } {
	const fitScoreSource = calculateFitScore(sourceFilePattern, input);
	const fitScoreTest = calculateFitScore(testFilePattern, input);
  
	const isSourceFile = fitScoreSource > fitScoreTest;
	const isTestFile = fitScoreTest > fitScoreSource;
  
	return { isSourceFile, isTestFile };
  }

function constructRegexPattern(userPattern: string): RegExp {
    // Replace any "." characters with "\\" first to escape them
    const escapedPattern = userPattern.replace(/\./g, "\\.");

    // Then replace {baseName} with (.*) in the escaped pattern
    const regexPattern = escapedPattern.replace(/\{baseName\}/g, "(.*)");

    // Create a RegExp object from the resulting pattern
    const regex = new RegExp(regexPattern);

    return regex;
}

function extractBaseName(fileName: string, pattern: RegExp): string | null {
    const match = fileName.match(pattern);
    return match && match.length > 1 ? match[1] : null;
}

function getConfigurations(editor: vscode.TextEditor) {
	const configuration = vscode.workspace.getConfiguration('switch', editor.document.uri);
	const sourcePath = configuration.get<string>('sourcePath', '');
	const testPath = configuration.get<string>('testPath', '');
	const sourceFilePattern = configuration.get<string>('sourceFilePattern', '');
	const testFilePattern = configuration.get<string>('testFilePattern', '');
	const sourceFileRegexp = constructRegexPattern(sourceFilePattern);
	const testFileRegexp = constructRegexPattern(testFilePattern);
	return { sourcePath, testPath, sourceFilePattern, testFilePattern, sourceFileRegexp, testFileRegexp };
}

function getCompanionFilePath(editor: vscode.TextEditor) {
	const document = editor.document;

	const { sourcePath, testPath, sourceFilePattern, testFilePattern, sourceFileRegexp, testFileRegexp } = getConfigurations(editor);

	console.log(sourcePath);
	console.log(testPath);
	console.log(sourceFilePattern);
	console.log(testFilePattern);
	// Get the directory of the current file and replace the source directory with test directory
	const fullFilePath = document.uri.fsPath;
	let fileInfo: { workspacePath: string, folderPath: string, fileName: string };
	try {
		fileInfo = separateFilePath(fullFilePath);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(errorMessage);
		console.error(errorMessage);
		console.log(errorMessage);
		return;
	}
	console.log('passed try block');
	console.log('File Info:', fileInfo); // Print fileInfo
	
	const { isSourceFile, isTestFile } = chooseFileTypes(fileInfo.fileName, sourceFileRegexp, testFileRegexp);
	console.log("isSourceFile: ", isSourceFile, ", isTestFile: ", isTestFile);
	
	let newFileName = fileInfo.fileName;
	let newFolderPath = fileInfo.folderPath;
	if (isSourceFile) {
		// Extract the baseName using the source pattern
		const baseName = extractBaseName(fileInfo.fileName, sourceFileRegexp);
		if (baseName !== null) {
			// Construct the new file name using the test pattern and baseName
			newFileName = testFilePattern.replace("{baseName}", baseName);
			newFolderPath = fileInfo.folderPath.replace(sourcePath, testPath);
			console.log('Transformed File Name:', newFileName);
		} else {
			vscode.window.showErrorMessage('Failed to extract baseName from file name.');
		}
	} else if (isTestFile) {
		// Extract the baseName using the test pattern
		const baseName = extractBaseName(fileInfo.fileName, testFileRegexp);
		if (baseName !== null) {
			// Construct the new file name using the source pattern and baseName
			newFileName = sourceFilePattern.replace("{baseName}", baseName);
			newFolderPath = fileInfo.folderPath.replace(testPath, sourcePath);
			console.log('Transformed File Name:', newFileName);
		} else {
			vscode.window.showErrorMessage('Failed to extract baseName from file name.');
		}
	} else {
		vscode.window.showErrorMessage('File name does not match source or test pattern.');
	}
								
	// Construct the new file path by joining the parts
	const newFilePath = vscode.Uri.file(
	`${fileInfo.workspacePath}/${newFolderPath}${newFileName}`
	);
	console.log('newFilePath: ', newFilePath);

	console.log('New File Path:', newFilePath.fsPath);
	return { newFilePath, isSourceFile };
}

async function extensionSwitch(fileUri: vscode.Uri) {
	// The code you place here will be executed every time your command is executed
	const document = fileUri ? await vscode.workspace.openTextDocument(fileUri) : vscode.window.activeTextEditor?.document;

	if (document) {
		console.log('entered if document');

		// Display a message box to the user
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			console.log('entered if editor');
			const companionFile = getCompanionFilePath(editor);
			
			if (companionFile !== undefined) {
				const { newFilePath, isSourceFile } = companionFile;
				try {
					// Check if the file exists at the new path
					const stats = await vscode.workspace.fs.stat(newFilePath);
	
					// File exists, open it
					const textDocument = await vscode.workspace.openTextDocument(newFilePath);
					await vscode.window.showTextDocument(textDocument);
				} catch (error) {
					// File does not exist
					if (isSourceFile) {
						console.log('Entering the isSourceFile block');
						try {
							const testFileTemplate = vscode.workspace.getConfiguration().get<string[]>('switch.testFileTemplate') || [];
							const { sourceFilePattern } = getConfigurations(editor);
							const fileName = vscode.workspace.asRelativePath(newFilePath).replace(sourceFilePattern, '');
							const content = testFileTemplate.join('\n').replace(/\$\{filename\}/g, fileName);
				
							await vscode.workspace.fs.writeFile(newFilePath, Buffer.from(content));
				
							// File created successfully, now open it
							const textDocument = await vscode.workspace.openTextDocument(newFilePath);
							await vscode.window.showTextDocument(textDocument);
						} catch (error) {
							vscode.window.showErrorMessage(`Error creating or opening file: ${error}`);
						}
					} else {
						console.log('Entering the else block');
						vscode.window.showErrorMessage('File does not exist.');
					}
				}
			}
		}
	}
}

async function extensionOpenSourceAndTest(fileUri: vscode.Uri) {
	const document = fileUri ? await vscode.workspace.openTextDocument(fileUri) : vscode.window.activeTextEditor?.document;

	if (document) {

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const companionFile = getCompanionFilePath(editor);
			
			if (companionFile !== undefined) {
				const { newFilePath, isSourceFile } = companionFile;
				try {
					// Check if the file exists at the new path
					const stats = await vscode.workspace.fs.stat(newFilePath);
	
					// File exists, open it
					const textDocument = await vscode.workspace.openTextDocument(newFilePath);
					await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One });
					await vscode.window.showTextDocument(textDocument, { viewColumn: vscode.ViewColumn.Two });
				} catch (error) {
					// File does not exist
					if (isSourceFile) {
						console.log('Entering the isSourceFile block');
						try {
							const testFileTemplate = vscode.workspace.getConfiguration().get<string[]>('switch.testFileTemplate') || [];
							const { sourceFilePattern } = getConfigurations(editor);
							const fileName = vscode.workspace.asRelativePath(newFilePath).replace(sourceFilePattern, '');
							const content = testFileTemplate.join('\n').replace(/\$\{filename\}/g, fileName);
				
							await vscode.workspace.fs.writeFile(newFilePath, Buffer.from(content));
				
							// File created successfully, now open it
							const textDocument = await vscode.workspace.openTextDocument(newFilePath);
							await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One });
							await vscode.window.showTextDocument(textDocument, { viewColumn: vscode.ViewColumn.Two });
						} catch (error) {
							vscode.window.showErrorMessage(`Error creating or opening file: ${error}`);
						}
					} else {
						console.log('Entering the else block');
						vscode.window.showErrorMessage('File does not exist.');
					}
				}
			}
		}
	}
}


export function activate(context: vscode.ExtensionContext) {
  	console.log('Congratulations, your extension "Switch" is now active!');
	
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.openSourceAndTest', extensionOpenSourceAndTest)
	);

  	context.subscriptions.push(
		vscode.commands.registerCommand('extension.switch', extensionSwitch)
	);

}

// This method is called when your extension is deactivated
export function deactivate() {

}
