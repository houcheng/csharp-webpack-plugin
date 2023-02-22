module.exports = (source) => {
    const options = this.getOptions()
    console.log("Run cs-loader")
    console.log("Run cs-loader with options: ", options)
    return source + 'with tail'
}
