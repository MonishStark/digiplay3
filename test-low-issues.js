// Low priority code quality issues for Gemini testing

function testFunction() {
  var oldStyleVar = "should use const or let"  // Missing semicolon
  
  console.log("Debug statement left in code")
  
  if (oldStyleVar == "test") {  // Using == instead of ===
    var anotherVar = "bad practice"
  }
  
  // Unused variable
  var unusedVariable = "this is never used"
  
  return oldStyleVar
}

// Missing JSDoc comments
function calculateTotal(items) {
  var total = 0
  for (var i = 0; i < items.length; i++) {  // Could use const and for...of
    total += items[i]
  }
  return total
}

module.exports = { testFunction, calculateTotal }
