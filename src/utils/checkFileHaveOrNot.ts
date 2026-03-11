import * as fs from "fs/promises";

export async function checkFileExists(filePath: string) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    console.log(`The file path exists: ${filePath}`);
    return true;
  } catch (error) {
    console.log(`The file path does not exist or is inaccessible: ${filePath}`);
    return false;
  }
}
