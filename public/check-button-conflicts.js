// Check what buttons/containers are currently on the page
function checkCurrentButtons() {
  console.log('🔍 Checking current UI elements...');
  
  // Find all elements that might be buttons or floating containers
  const allDivs = document.querySelectorAll('div');
  const allButtons = document.querySelectorAll('button');
  
  console.log(`Found ${allDivs.length} divs and ${allButtons.length} buttons`);
  
  // Look for floating/fixed positioned elements (likely our test buttons)
  const floatingElements = [];
  
  [...allDivs, ...allButtons].forEach((el, i) => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'absolute') {
      const rect = el.getBoundingClientRect();
      floatingElements.push({
        element: el,
        text: el.textContent.substring(0, 50),
        position: style.position,
        top: style.top,
        left: style.left,
        zIndex: style.zIndex,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      });
    }
  });
  
  console.log('🎯 Floating/positioned elements found:');
  floatingElements.forEach((item, i) => {
    console.log(`${i + 1}. "${item.text}" - ${item.position} (z: ${item.zIndex}) at ${item.rect.top}, ${item.rect.left}`);
  });
  
  if (floatingElements.length > 1) {
    console.log('⚠️ Multiple floating elements detected! This could cause overlapping buttons.');
    
    // Offer to remove all but the bulletproof one
    const bulletproofElement = floatingElements.find(item => 
      item.text.includes('🛡️') || item.text.includes('Bulletproof')
    );
    
    if (bulletproofElement) {
      console.log('✅ Found bulletproof element:', bulletproofElement.text);
      
      const othersToRemove = floatingElements.filter(item => item !== bulletproofElement);
      if (othersToRemove.length > 0) {
        console.log('🗑️ Other elements that could be removed:');
        othersToRemove.forEach((item, i) => {
          console.log(`  ${i + 1}. "${item.text}"`);
        });
        
        console.log('🔧 To remove overlapping elements, run: cleanupOverlappingButtons()');
      }
    }
  } else if (floatingElements.length === 1) {
    console.log('✅ Only one floating element found - should be clean!');
  } else {
    console.log('❌ No floating elements found - bulletproof button might not be loaded yet');
  }
  
  return floatingElements;
}

function cleanupOverlappingButtons() {
  console.log('🧹 Cleaning up overlapping buttons...');
  
  const allElements = [...document.querySelectorAll('div'), ...document.querySelectorAll('button')];
  let removed = 0;
  
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'absolute') {
      const text = el.textContent;
      
      // Keep only the bulletproof element
      if (!text.includes('🛡️') && !text.includes('Bulletproof')) {
        // But be careful - don't remove important UI elements
        if (text.includes('🔄') || text.includes('🧹') || text.includes('📱') || text.includes('🔧') || text.includes('⚡') || text.includes('🎯')) {
          console.log(`🗑️ Removing: "${text.substring(0, 30)}..."`);
          el.remove();
          removed++;
        }
      }
    }
  });
  
  console.log(`✅ Removed ${removed} overlapping elements`);
  
  // Check again
  setTimeout(() => {
    console.log('📊 Checking again after cleanup...');
    checkCurrentButtons();
  }, 1000);
}

// Auto-run the check
checkCurrentButtons();

console.log('💡 Available commands:');
console.log('  checkCurrentButtons() - See what floating elements exist');
console.log('  cleanupOverlappingButtons() - Remove overlapping test buttons');
