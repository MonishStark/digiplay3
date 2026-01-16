// Low priority code quality issues for Gemini validation

function sampleFunc(){
  var count = 0
  console.log("debug log")
  if(count == 0){
    var msg = "loose equality"
  }
  var unused = 123
  return count
}

module.exports = { sampleFunc }
