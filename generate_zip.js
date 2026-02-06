import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, '../artifact-cli');
const OUT_PATH = path.join(__dirname, 'public/downloads/artifact-cli.zip');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'venv' && file !== '__pycache__' && file !== '.git' && file !== 'node_modules') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

async function createZip() {
  console.log("Zipping Artifact CLI from: " + SOURCE_DIR);
  const zip = new JSZip();
  const folder = zip.folder("artifact-cli");
  
  const allFiles = getAllFiles(SOURCE_DIR);
  
  // Add icon manually if it exists in the source, otherwise try to copy from web app
  try {
      const iconPath = path.join(__dirname, 'public/favicon.png');
      if (fs.existsSync(iconPath)) {
          folder.file("icon.png", fs.readFileSync(iconPath));
      }
  } catch (e) {}

  allFiles.forEach(filePath => {
      const relativePath = path.relative(SOURCE_DIR, filePath);
      // Skip unwanted files
      if (relativePath.includes('.DS_Store') || relativePath.endsWith('.pyc')) return;
      
      folder.file(relativePath, fs.readFileSync(filePath));
      console.log("Added: " + relativePath);
  });

  const content = await zip.generateAsync({ 
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
  });
  
  // Ensure download dir exists
  const downloadDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(downloadDir)){
      fs.mkdirSync(downloadDir, { recursive: true });
  }

  fs.writeFileSync(OUT_PATH, content);
  console.log("✅ Zip created successfully at " + OUT_PATH);
}

createZip();
