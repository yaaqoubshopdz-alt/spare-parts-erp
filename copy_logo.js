const fs = require('fs');
try {
  const src = "C:\\Users\\blbl\\Downloads\\ChatGPT Image 31 مايو 2026، 02_53_24 ص.png";
  const dest = "c:\\aissa\\src\\features\\auth\\logo.png";
  fs.copyFileSync(src, dest);
  console.log("Success: Logo copied successfully!");
} catch (e) {
  console.error("Error copying file:", e);
}
