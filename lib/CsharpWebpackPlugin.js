'use strict'
exports.__esModule = true
exports.CsharpWebpackPlugin = void 0
const fs = require('fs')
const path = require('path')
// default is not a function:: import createConverter from 'csharp-models-to-typescript/converter'
// is not a function:: import { createConverter } from 'csharp-models-to-typescript/converter'
// import createConverter from 'csharp-models-to-typescript/converter'
const CsTs = require('./CsTs.js')
const csConfigJson = 'csconfig.json'

// Compare 2 files and returns true if the first file is newer than the second file
function isFileNewer (csFile, tsFile) {
  return (fs.statSync(csFile).mtime > fs.statSync(tsFile).mtime)
      // why always true this line ?
      // || (fs.statSync(csConfigJson).mtime > fs.statSync(tsFile).mtime)
}
function getCsFiles () {
  const csFiles = []
  var traverseDirectory = function (dirPath) {
    const files = fs.readdirSync(dirPath)
    files.forEach(function (file) {
      const fullPath = path.join(dirPath, file)
      if (fs.statSync(fullPath).isDirectory()) {
        traverseDirectory(fullPath)
      } else if (path.extname(file) === '.cs') {
        csFiles.push(fullPath)
      }
    })
  }
  traverseDirectory('src')
  // csFiles.push(csConfigJson)
  return csFiles
}
function readCsJson () {
  const csJsonPath = './csconfig.json'
  const csJsonContents = fs.readFileSync(csJsonPath, 'utf8')
  const csJsonObject = JSON.parse(csJsonContents)
  return csJsonObject
}
// Loads CS files and compiles them to JS
class CsharpWebpackPlugin {
  // eslint-disable-next-line no-useless-constructor
  constructor (options = {}) {
    console.log('The options is: ', options)
    this.options = options
  }

  apply (compiler) {
    // TODO: Changes to tapAsync, see https://webpack.js.org/contribute/writing-a-plugin/
    compiler.hooks.emit.tap('cs-loader', function (compilation) {
      console.log('The afterPlugins is starting a new build...')
      const configJson = readCsJson()
      const csFiles = getCsFiles()
      console.log('get cs files: ', csFiles)

      let isModified = false
      for (let _i = 0; _i < csFiles.length; _i++) {
        const csFile = csFiles[_i]
        const tsFile = csFile.split('.')[0] + '.ts'
        console.log('The cs file added, ', csFile)
        compilation.fileDependencies.add(csFile)
        if (!fs.existsSync(tsFile) || isFileNewer(csFile, tsFile)) {
          isModified = true
          break
        }
      }

      // TODO: Maybe no need here
      const csFile = csFiles[0]
      const tsFile = csFile.split('.')[0] + '.ts'
      if (isModified) {
        CsTs(configJson, csFile, tsFile)
      }
    })
    console.log('register emit is done')
    compiler.hooks.watchRun.tapAsync('CsharpWebpackPlugin', (comp, callback) => {
      const watchedFiles = new Set()

      // console.log('watch run is called', comp)
      console.log('the modified Files: ', comp.modifiedFiles)
      // console.log('timestamps: ', comp.fileTimestamps) // huge list of files
      // console.log('removedFiles: ', comp.removedFiles)

      // comp.watchFileSystem.watcher.mtimes
      if (comp.modifiedFiles) {
        console.log('modifiedFiles is called')
        Array.from(comp.modifiedFiles).forEach(f => {
          console.log('file changes: ', f)
        })
      }
      console.log('done')
      callback()
    })
  }

  name () {
    console.log('The name is called')
    return 'cs-loader'
  }
}

module.exports = CsharpWebpackPlugin
