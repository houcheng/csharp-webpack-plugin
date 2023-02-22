// import fs from 'fs'
//  default is not a function
//  import createConverter from 'csharp-models-to-typescript/converter'
// import createConverter from 'csharp-models-to-typescript/converter'
const fs = require('fs')
const path = require('path');
const { spawn } = require('child_process')
const createConverter = require('./converter')

function csToTs (configJson, csFile, tsFile) {
  configJson.include = [csFile]
  configJson.output = tsFile

  const configPath = 'csconfig.json'
  const dotnetProject = path.join(__dirname, './csharp-models-to-json');
  const dotnetProcess = spawn('dotnet', ['run', `--project "${dotnetProject}"`, `"${path.resolve(configPath)}"`], { shell: true });

  let stdout = ''

  dotnetProcess.stdout.on('data', data => {
    stdout += data;
  })

  dotnetProcess.stdout.on('end', () => {
    const csFilesJson = JSON.parse(stdout)
    const converter = createConverter(configJson)

    const outputFiles = converter(csFilesJson)
    outputFiles.forEach(outputFile => {
      tsFile = outputFile.file.FileName.split('.')[0] + '.ts'
      fs.writeFileSync(tsFile, outputFile.content)
    })

    console.log(`The process is done with ${outputFiles.length} files`)
  })
  return 0
}

module.exports = csToTs
