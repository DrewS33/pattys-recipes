const fs = require('fs');
const path = require('path');

const outputFiles = [
  'a02cd25be756c11e4', // batch 1 - chicken pt1
  'aed9ecd6e1ea07003', // batch 2 - chicken pt2
  'a6ef719ad132c5e2f', // batch 3 - chicken soups/special
  'aa61ca3aebf64886e', // batch 4 - beef/pork pt1
  'a78c311255c7b3a9a', // batch 5 - beef/pork pt2
  'a8f3f9c79ef213e3f', // batch 6 - seafood/pasta
  'a9e3b92f2ae0188dc', // batch 7 - desserts/sides
];

const baseDir = 'C:\\Users\\Drew\\AppData\\Local\\Temp\\claude\\s--Claude\\2c4684ea-0a8a-4616-9b41-a445dfaba7c5\\tasks';

function extractJSONArray(content) {
  const start = content.indexOf('[');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < content.length; i++) {
    const c = content[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (!inString) {
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) return content.substring(start, i + 1); }
    }
  }
  return null;
}

let counter = 0;
function generateId() {
  counter++;
  const timestamp = Date.now() + counter;
  const random = Math.random().toString(36).substring(2, 9);
  return `recipe-${timestamp}-${random}`;
}

const allNewRecipes = [];
const batchResults = [];

for (const fileId of outputFiles) {
  const filePath = path.join(baseDir, `${fileId}.output`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const jsonStr = extractJSONArray(content);
    if (!jsonStr) { console.error(`No JSON found in ${fileId}`); continue; }
    const recipes = JSON.parse(jsonStr);
    recipes.forEach(r => { r.id = generateId(); allNewRecipes.push(r); });
    console.log(`Batch ${fileId}: ${recipes.length} recipes`);
    batchResults.push({ fileId, count: recipes.length });
  } catch (e) {
    console.error(`Error in ${fileId}: ${e.message}`);
  }
}

const recipesPath = 'S:\\Claude\\Moms Recipe App\\pattys-recipes\\src\\data\\pattys-recipes.json';
const existing = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
console.log(`\nExisting: ${existing.length}, New: ${allNewRecipes.length}`);

const merged = [...existing, ...allNewRecipes];
fs.writeFileSync(recipesPath, JSON.stringify(merged, null, 2));
console.log(`Done! Total recipes: ${merged.length}`);

// --- Build CSV Report ---
const addedNames = allNewRecipes.map(r => r.name);

const alreadyInApp = [
  { name: "Beef Veg Soup (Lady & Sons)", sheetName: "Beef Veg Soup", reason: "Already in app" },
  { name: "Beef tips with Stew Meat", sheetName: "beef tips with stew meat", reason: "Already in app" },
  { name: "Beef Tips and Gravy", sheetName: "beef tips & gravy", reason: "Already in app" },
  { name: "Beef Tenderloin", sheetName: "beef tenderloin", reason: "Already in app" },
  { name: "Beef Burgundy Over Noodles", sheetName: "Beef Burgundy over noodles", reason: "Already in app" },
  { name: "Italian Breaded Steak", sheetName: "breaded steak", reason: "Already in app" },
  { name: "Amagio Sauce", sheetName: "amagio sauce", reason: "Already in app (referenced in breaded steak)" },
  { name: "Asian Ground Turkey with Rice", sheetName: "Asian Green Bean Turkey", reason: "Already in app" },
];

const skipped = [
  { sheetName: "authentic mexican recipes", reason: "Too generic - category, not a recipe" },
  { sheetName: "Arugala Pizza", reason: "No recipe data in sheet" },
  { sheetName: "boneless chicken thighs", reason: "Too vague - no specific recipe" },
  { sheetName: "Brad's spaghetti", reason: "Personal recipe with no data" },
  { sheetName: "Chicken Brocolli StirFry (2nd entry)", reason: "Duplicate in sheet" },
  { sheetName: "Chicken parmesan (2nd entry)", reason: "Duplicate of Chicken Parmesan" },
  { sheetName: "Chicken Tetrazzini - Giada", reason: "Added as Chicken Tetrazzini" },
  { sheetName: "Chicken Stir fry w rice noodles", reason: "Similar to Chicken Broccoli Stir Fry" },
  { sheetName: "chicken thighs lemon honey", reason: "Similar to Lemon Chicken (added)" },
  { sheetName: "chicken w/pineapple", reason: "Too vague - no recipe data" },
  { sheetName: "Chili", reason: "Too vague; Chicken Chili was added" },
  { sheetName: "Chipotle Chicken Bowl", reason: "Too vague - no recipe data" },
  { sheetName: "cinnamon rolls (duplicate)", reason: "Added as Homemade Cinnamon Rolls" },
  { sheetName: "classic beef stew", reason: "Similar to Instant Pot Beef Stew (added)" },
  { sheetName: "cornmeal mush", reason: "Too basic/simple - no data" },
  { sheetName: "CP honey garlic soy thighs", reason: "Abbreviation CP unclear" },
  { sheetName: "crockpot flank steak", reason: "Marked **** (uncertain) in sheet" },
  { sheetName: "crockpot Korean beef", reason: "Similar to Korean Ground Beef Bowl (added)" },
  { sheetName: "crockpot slow cooker beef strog", reason: "Similar to Beef Stroganoff (added)" },
  { sheetName: "crockpot whole chicken", reason: "Too vague - no recipe data" },
  { sheetName: "delish crockpot mac n cheese", reason: "No recipe data in sheet" },
  { sheetName: "doctored choco cake", reason: "Unclear note ('zss') - skipped" },
  { sheetName: "easy mongolian beef ****", reason: "Marked **** (uncertain) in sheet" },
  { sheetName: "feeding starter once a week", reason: "Maintenance routine, not a recipe" },
  { sheetName: "flank steak marinade**", reason: "Partial note only - not a full recipe" },
  { sheetName: "freezer beef and brocolli", reason: "Freezer prep note - unclear recipe" },
  { sheetName: "freezer mongolian beef", reason: "Freezer prep note - unclear recipe" },
  { sheetName: "french fry seasoning", reason: "Just a seasoning blend, not a recipe" },
  { sheetName: "Fried Chicken", reason: "Added as Air Fryer Fried Chicken" },
  { sheetName: "frozen chuck roast**", reason: "Marked ** (uncertain) in sheet" },
  { sheetName: "General Tso's Crockpot", reason: "Added standard General Tso's; crockpot variant skipped" },
  { sheetName: "Gr. Chix Sausage & Sp Squash", reason: "Abbreviations unclear" },
  { sheetName: "grilled flap steak (x2)", reason: "Duplicate entries; similar to flank steak" },
  { sheetName: "Grilled Marinated Flank Steak", reason: "Similar to Flank Steak & Chimichurri (added)" },
  { sheetName: "homemade taco seasoning", reason: "Just a seasoning, not a recipe" },
  { sheetName: "Honey Chicken lime skewers", reason: "Conflicting note ('crunch thai salad') - unclear" },
  { sheetName: "Hoty's Chili", reason: "Personal recipe name with no data" },
  { sheetName: "instagram pot roast", reason: "Unclear source reference" },
  { sheetName: "jo's peanut butter pie", reason: "Personal recipe with specific crust instructions" },
  { sheetName: "lemon chic thighs", reason: "Similar to Lemon Chicken (added)" },
  { sheetName: "Marinated Flank Steak", reason: "Similar to Flank Steak & Chimichurri (added)" },
  { sheetName: "no bake oatmeal choc chip oatmeal bars (dup)", reason: "Added as No-Bake Oatmeal Chocolate Chip Bars" },
  { sheetName: "once a week from fridge sourdough", reason: "Maintenance routine, not a recipe" },
  { sheetName: "pan seared cod in white wine **", reason: "Marked ** (uncertain) in sheet" },
  { sheetName: "Paula Dean Mac n cheese", reason: "Personal modification notes - skipped" },
  { sheetName: "peppermint bark cheesecake", reason: "Duplicate of peppermint chocolate cheesecake" },
  { sheetName: "peppermint chocolate cheesecake", reason: "Insufficient data in sheet" },
  { sheetName: "pork schnitzel", reason: "Only partial note ('add nutmeg') in sheet" },
  { sheetName: "Ribs (generic)", reason: "Added as Baby Back Ribs" },
  { sheetName: "salmon on plank rub", reason: "Rub only - not a complete recipe" },
  { sheetName: "sheet pan freezer beef and broccoli", reason: "Freezer prep variant - unclear" },
  { sheetName: "shrimp -sarah's", reason: "Personal recipe with no data" },
  { sheetName: "skinny swedish meatballs", reason: "Duplicate of Lighter Swedish Meatballs (added)" },
  { sheetName: "slow cooker s&s brisket", reason: "Abbreviation s&s unclear" },
  { sheetName: "slow cooker thai noodles", reason: "Only 'lime juice' note - incomplete data" },
  { sheetName: "slower cooker garlic parm potato thighs", reason: "Unclear recipe name" },
  { sheetName: "Smoked Steak", reason: "Too vague - no recipe data" },
  { sheetName: "smoky chili braised beef with stew meat**", reason: "Note 'DO NOT DOUBLE SAUCE' - personal variant" },
  { sheetName: "sourdough", reason: "Too vague" },
  { sheetName: "sourdough bread (x2)", reason: "Duplicate entries; bread only" },
  { sheetName: "sourdough bread - the clever carrot", reason: "Bread recipe only - skipped" },
  { sheetName: "sourdough chix pot pie", reason: "Variant with insufficient data" },
  { sheetName: "stawberry cheesecake", reason: "Insufficient data in sheet" },
  { sheetName: "Stew", reason: "Too vague; Instant Pot Beef Stew was added" },
  { sheetName: "street tacos", reason: "Too vague - no recipe data" },
  { sheetName: "Swedish meatballs", reason: "Added as Lighter Swedish Meatballs" },
  { sheetName: "sweet & spicy roast chicken", reason: "Note 'too many calories' in sheet - skipped" },
  { sheetName: "Tessener Steak", reason: "Unknown recipe name" },
  { sheetName: "thai chicken (am test kitc)", reason: "Specific ATK recipe could not be confirmed" },
  { sheetName: "tomato pie", reason: "Insufficient data in sheet" },
  { sheetName: "vietnamese style mb", reason: "Abbreviation 'mb' unclear" },
  { sheetName: "warm apricot couscous", reason: "Not included in batch processing" },
  { sheetName: "weekday sourdough recipe", reason: "Maintenance routine, not a recipe" },
  { sheetName: "beef - eye round", reason: "Too vague - no recipe data" },
  { sheetName: "best choco cake ever", reason: "Vague name with no data in sheet" },
  { sheetName: "chicken salad -", reason: "Incomplete name in sheet" },
  { sheetName: "ciabbata", reason: "Just a bread type - no recipe data" },
];

// Build CSV
const lines = [];
lines.push('Status,Sheet Recipe Name,App Recipe Name,Notes');

// Added
for (const r of allNewRecipes) {
  lines.push(`Added,"${r.name}","${r.name}","Successfully added to app"`);
}

// Already in app
for (const r of alreadyInApp) {
  lines.push(`Already in App,"${r.sheetName}","${r.name}","${r.reason}"`);
}

// Skipped
for (const r of skipped) {
  lines.push(`Skipped,"${r.sheetName}","","${r.reason}"`);
}

const csvPath = 'S:\\Claude\\Moms Recipe App\\pattys-recipes-report.csv';
fs.writeFileSync(csvPath, lines.join('\n'));
console.log(`\nReport written to: ${csvPath}`);
console.log(`\nSummary:`);
console.log(`  Added: ${allNewRecipes.length}`);
console.log(`  Already in app: ${alreadyInApp.length}`);
console.log(`  Skipped: ${skipped.length}`);
