const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 检查是否安装了archiver模块
try {
  require.resolve('archiver');
} catch (e) {
  console.log('请先安装archiver模块: npm install archiver');
  console.log('或者使用Chrome浏览器手动打包扩展');
  process.exit(1);
}

// 项目根目录
const rootDir = __dirname;
const outputDir = path.join(rootDir, 'dist');
const outputFilename = 'link-timer.zip';
const outputPath = path.join(outputDir, outputFilename);

// 创建输出目录
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// 创建输出流
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最大压缩级别
});

// 监听打包完成事件
output.on('close', function () {
  console.log(`扩展打包完成: ${outputPath}`);
  console.log(`压缩包大小: ${archive.pointer()} 字节`);
});

// 监听打包错误事件
archive.on('error', function(err) {
  throw err;
});

// 将压缩包数据管道传输到文件输出流
archive.pipe(output);

// 添加文件到压缩包
const filesToAdd = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'README.md'
];

const dirsToAdd = [
  'icons'
];

// 添加文件
filesToAdd.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
  } else {
    console.warn(`警告: 文件 ${file} 不存在`);
  }
});

// 添加目录
dirsToAdd.forEach(dir => {
  const dirPath = path.join(rootDir, dir);
  if (fs.existsSync(dirPath)) {
    archive.directory(dirPath, dir);
  } else {
    console.warn(`警告: 目录 ${dir} 不存在`);
  }
});

// 完成打包
archive.finalize();

console.log('正在打包Chrome扩展...');
console.log('扩展名称: Link Timer');
console.log('输出路径: ' + outputPath);