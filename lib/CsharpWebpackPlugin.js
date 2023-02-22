'use strict'
exports.__esModule = true
exports.CsharpWebpackPlugin = void 0
const fs = require('fs')
const CsTs = require('./CsTs.js')
const glob = require('glob')
const path = require("path");

// Compare 2 files and returns true if the first file is newer than the second file
const isFileNewer = (csFile, tsFile) => (fs.statSync(csFile).mtime > fs.statSync(tsFile).mtime)
// || (fs.statSync(csConfigJson).mtime > fs.statSync(tsFile).mtime)

function getCsFiles (configJson) {
  const flatten = arr => arr.reduce((a, b) => a.concat(b), [])
  return flatten(configJson.include.map((pattern) => glob.sync(pattern, { nodir: true })))
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
    this.options = options
  }

  apply (compiler) {
    // TODO: Changes to tapAsync, see https://webpack.js.org/contribute/writing-a-plugin/
    compiler.hooks.emit.tap('CsharpWebpackPlugin', function (compilation) {
      const configJson = readCsJson()
      const csFiles = getCsFiles(configJson)
      // console.log('get cs files: ', csFiles)

      let isModified = false
      for (let i = 0; i < csFiles.length; i++) {
        const csFile = csFiles[i]
        const tsFile = csFile.split('.')[0] + '.ts'
        compilation.fileDependencies.add(path.join(csFile))

        if (!fs.existsSync(tsFile) || isFileNewer(csFile, tsFile)) {
          isModified = true
        }
      }

      if (isModified) {
        CsTs(configJson)
      }
    })
    console.log('register emit is done')
    compiler.hooks.watchRun.tapAsync('CsharpWebpackPlugin', (comp, callback) => {
      console.log('the modified Files: ', comp.modifiedFiles)
      if (comp.modifiedFiles) {
        Array.from(comp.modifiedFiles).forEach(file => {
          console.log('File change detected: ', file)
        })
      }
      callback()
    })
  }
}

module.exports = CsharpWebpackPlugin
