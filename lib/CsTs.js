// import fs from 'fs'
//  default is not a function
//  import createConverter from 'csharp-models-to-typescript/converter'
// import createConverter from 'csharp-models-to-typescript/converter'
const fs = require('fs')
const path = require('path');
const { spawn } = require('child_process')
const createConverter = require('./converter')

function csToTs (configJson) {
  const configPath = 'csconfig.json'
  const dotnetProject = path.join(__dirname, '../csharp-models-to-json');
  const dotnetProcess = spawn('dotnet', ['run', `--project "${dotnetProject}"`, `"${path.resolve(configPath)}"`], { shell: true });

  let stdout = ''

  console.log('__dirname is', __dirname)
  console.log('dotnetProject is', dotnetProject)
  console.log('dotnetProcess.spawnargs is', dotnetProcess.spawnargs)

  dotnetProcess.stdout.on('data', data => {
    stdout += data;
  })

  dotnetProcess.stdout.on('end', () => {
    console.log('end with stdout: ', stdout)

    const csFilesJson = JSON.parse(stdout)
    const converter = createConverter(configJson)

    const outputFiles = converter(csFilesJson)
    outputFiles.forEach(outputFile => {
      if (outputFile.content) {
        const tsFile = outputFile.file.FileName.split('.')[0] + '.ts'
        fs.writeFileSync(tsFile, outputFile.content)
      }
      if (outputFile.wrapper) {
        const jsFile = outputFile.file.FileName.split('.')[0] + 'Wrappers.js'
        fs.writeFileSync(jsFile, outputFile.wrapper)
      }
    })

    console.log(`The process is done with ${outputFiles.length} files`)
  })
  return 0
}

module.exports = csToTs
