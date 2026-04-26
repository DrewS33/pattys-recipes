import { useState, useEffect } from 'react';
import {
  Recipe,
  Ingredient,
  DifficultyLevel,
  ProteinType,
  MealType,
  GrocerySection,
} from '../types';
import { importRecipeFromUrl } from '../utils/urlImporter';
import { parseRecipeText, parseIngredientLine } from '../utils/recipeTextParser';

// ============================================================
// AddEditRecipe: modal form for creating or editing a recipe
// ============================================================

interface AddEditRecipeProps {
  recipe: Recipe | null; // null = adding new
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}

const DIFFICULTY_OPTIONS: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];
const PROTEIN_OPTIONS: ProteinType[] = [
  'Chicken', 'Beef', 'Pork', 'Turkey', 'Seafood',
  'Pasta', 'Soup', 'Vegetarian', 'Other',
];
const MEAL_TYPE_OPTIONS: MealType[] = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Side Dish',
];
const GROCERY_SECTION_OPTIONS: GrocerySection[] = [
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery',
  'Pantry', 'Canned Goods', 'Frozen', 'Spices & Seasonings',
  'Beverages', 'Miscellaneous',
];

// ============================================================
// CHATGPT IMPORT PROMPTS
// ============================================================
const CHATGPT_PROMPT_URL_TEXT = `MASTER RECIPE FORMAT PROMPT
Format this recipe for me using EXACTLY this structure.
Follow ALL rules strictly so it can be parsed by an app.
________________________________________
GENERAL RULES (VERY IMPORTANT)
• DO NOT guess or invent information
• ONLY use information explicitly stated in the recipe
• If something is unclear or missing, LEAVE IT OUT
• Keep units EXACTLY as written in the recipe (no weird conversions like decimals)
• Keep instructions beginner-friendly with clear detail
• Include temperatures, cook times, and pan sizes WHEN AVAILABLE
• Do NOT include links, citations, or sources
• Do NOT add extra commentary
________________________________________
METADATA FORMAT (MUST BE FIRST)
Use EXACTLY this format:
Prep time: X minutes
Cook time: X minutes
Serves: X
________________________________________
INGREDIENT RULES (STRICT)
• Header must be: Ingredients
• Each ingredient MUST be on its own line
• Format MUST be:
[number] [unit] [ingredient name], [prep note]
• Quantity ALWAYS comes first
• NEVER write "2 cups of flour" → write "2 cups flour"
• NEVER write "flour - 2 cups"
• Use ONLY these units:
tbsp, tsp, cup, lb, oz, g, kg, ml, clove, can, package, pinch, dash, bunch, slice, piece, sprig
• If no unit (like eggs), write:
2 eggs
• Prep notes go after a comma:
2 cloves garlic, minced
• Or in parentheses:
1 lb chicken breast (boneless, skinless)
• Use fractions ONLY:
1/2, 1 1/2, 2/3 (NO decimals)
• DO NOT convert units unless absolutely necessary
• DO NOT group ingredients or add categories
________________________________________
INSTRUCTIONS RULES (STRICT)
• Header must be: Instructions
• Numbered steps ONLY (no titles, no sections)
• Write in clear, beginner-friendly language
• Include:
o Pan sizes (10–12 inch skillet, 9x13 dish, etc.)
o Temperatures (oven or internal when relevant)
o Approximate timing for each step
• Avoid vague phrases like "cook until done"
• Be specific and actionable
________________________________________
NOTES RULES
• Header must be: Notes
• Only include helpful tips FROM the recipe or clearly implied
• Keep concise
________________________________________
FINAL STRUCTURE (EXACT ORDER)
Recipe Name
Short description (1 sentence)
Prep time: X minutes
Cook time: X minutes
Serves: X
Ingredients
[formatted list]
Instructions
[numbered steps]
Notes
[short notes]
________________________________________
NOW FORMAT THIS RECIPE:
[PASTE LINK OR TEXT HERE]`;

const CHATGPT_PROMPT_IMAGE = CHATGPT_PROMPT_URL_TEXT.replace(
  'NOW FORMAT THIS RECIPE:\n[PASTE LINK OR TEXT HERE]',
  'NOW FORMAT THE RECIPE SHOWN IN THIS IMAGE:\n[PASTE IMAGE HERE]'
);

// Clipboard helper with fallback for older/mobile browsers
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// A blank ingredient template
const blankIngredient = (): Ingredient => ({
  name: '',
  quantity: 1,
  unit: '',
  grocerySection: 'Pantry',
  prepNote: '',
});

// Generate a simple unique ID
function generateId(): string {
  return `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Compress an image file to a JPEG data URL (max 640×480, 0.65 quality)
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_W = 640, MAX_H = 480;
      let { width, height } = img;
      if (width > MAX_W) { height = Math.round(height * MAX_W / width); width = MAX_W; }
      if (height > MAX_H) { width = Math.round(width * MAX_H / height); height = MAX_H; }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

// Build a blank recipe form state
function blankRecipe(): Recipe {
  return {
    id: generateId(),
    name: '',
    description: '',
    difficulty: 'Easy',
    prepTimeMinutes: 10,
    cookTimeMinutes: 30,
    totalTimeMinutes: 40,
    defaultServings: 4,
    tags: [],
    proteinType: 'Chicken',
    mealType: 'Dinner',
    favorite: false,
    ingredients: [blankIngredient()],
    instructions: [''],
    notes: '',
  };
}

export default function AddEditRecipe({ recipe, isOpen, onClose, onSave }: AddEditRecipeProps) {
  const [form, setForm] = useState<Recipe>(blankRecipe());
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseNotice, setParseNotice] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<'url-text' | 'image' | null>(null);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (recipe) {
        setForm({ ...recipe });
        setTagsInput(recipe.tags.join(', '));
      } else {
        const fresh = blankRecipe();
        setForm(fresh);
        setTagsInput('');
      }
      setErrors([]);
      setImportUrl('');
      setImportStatus('idle');
      setImportError('');
      setShowPastePanel(false);
      setPasteText('');
      setParseNotice(false);
      setCopiedPrompt(null);
    }
  }, [isOpen, recipe]);

  // ---- URL import ----
  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImportStatus('loading');
    setImportError('');
    try {
      const imported = await importRecipeFromUrl(importUrl.trim());
      setForm((prev) => ({
        ...prev,
        name: imported.name || prev.name,
        description: imported.description || prev.description,
        prepTimeMinutes: imported.prepTimeMinutes || prev.prepTimeMinutes,
        cookTimeMinutes: imported.cookTimeMinutes || prev.cookTimeMinutes,
        totalTimeMinutes: imported.totalTimeMinutes || prev.totalTimeMinutes,
        defaultServings: imported.defaultServings || prev.defaultServings,
        ingredients: imported.ingredients.length > 0
          ? imported.ingredients.map((ing) => ({ ...blankIngredient(), ...ing }))
          : prev.ingredients,
        instructions: imported.instructions.length > 0 ? imported.instructions : prev.instructions,
        notes: imported.notes || prev.notes,
        image: imported.image || prev.image,
      }));
      setImportUrl('');
      setImportStatus('idle');
    } catch (e: unknown) {
      setImportStatus('error');
      setImportError(e instanceof Error ? e.message : 'Failed to import recipe');
    }
  };

  // ---- ChatGPT prompt copy ----
  const handleCopyPrompt = async (type: 'url-text' | 'image') => {
    const text = type === 'image' ? CHATGPT_PROMPT_IMAGE : CHATGPT_PROMPT_URL_TEXT;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedPrompt(type);
      setTimeout(() => setCopiedPrompt(null), 2000);
    }
  };

  // ---- Paste-text import ----
  const handleParseText = () => {
    if (!pasteText.trim()) return;
    const parsed = parseRecipeText(pasteText);

    setForm((prev) => {
      const updated = { ...prev };
      if (parsed.name)        updated.name        = parsed.name;
      if (parsed.description) updated.description = parsed.description;
      if (parsed.servings)    updated.defaultServings = parsed.servings;
      if (parsed.prepTimeMinutes)  updated.prepTimeMinutes  = parsed.prepTimeMinutes;
      if (parsed.cookTimeMinutes)  updated.cookTimeMinutes  = parsed.cookTimeMinutes;
      if (parsed.totalTimeMinutes) updated.totalTimeMinutes = parsed.totalTimeMinutes;
      else if (parsed.prepTimeMinutes && parsed.cookTimeMinutes) {
        updated.totalTimeMinutes = parsed.prepTimeMinutes + parsed.cookTimeMinutes;
      }
      if (parsed.ingredients.length > 0) {
        updated.ingredients = parsed.ingredients.map((ing) => ({ ...blankIngredient(), ...ing }));
      }
      if (parsed.instructions.length > 0) updated.instructions = parsed.instructions;
      if (parsed.notes)       updated.notes       = parsed.notes;
      if (parsed.proteinType) updated.proteinType = parsed.proteinType;
      if (parsed.mealType)    updated.mealType    = parsed.mealType;
      return updated;
    });

    setShowPastePanel(false);
    setPasteText('');
    setParseNotice(true);
  };

  // ---- Photo upload ----
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const compressed = await compressImage(file);
      setField('image', compressed);
    } catch {
      alert('Failed to process image. Please try a different photo.');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ---- Field update helpers ----

  const setField = <K extends keyof Recipe>(key: K, value: Recipe[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      // Auto-compute total time
      if (key === 'prepTimeMinutes' || key === 'cookTimeMinutes') {
        updated.totalTimeMinutes =
          (key === 'prepTimeMinutes' ? (value as number) : prev.prepTimeMinutes) +
          (key === 'cookTimeMinutes' ? (value as number) : prev.cookTimeMinutes);
      }
      return updated;
    });
  };

  // ---- Ingredients ----

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = form.ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    );
    setField('ingredients', updated);
  };

  const addIngredient = () => {
    setField('ingredients', [...form.ingredients, blankIngredient()]);
  };

  const removeIngredient = (index: number) => {
    setField('ingredients', form.ingredients.filter((_, i) => i !== index));
  };

  // When the user tabs out of the name field, auto-parse an embedded
  // quantity+unit prefix (e.g. "¼ cup basil" → qty:0.25 unit:"cup" name:"basil").
  // Only fires when the parsed name differs from the raw input, meaning
  // something was actually stripped out.
  const handleIngredientNameBlur = (index: number) => {
    const ing = form.ingredients[index];
    if (!ing.name.trim()) return;
    const parsed = parseIngredientLine(ing.name);
    if (!parsed || parsed.name === ing.name) return;
    setField(
      'ingredients',
      form.ingredients.map((item, i) =>
        i !== index
          ? item
          : {
              ...item,
              name: parsed.name,
              quantity: parsed.quantity,
              unit: parsed.unit,
              prepNote: parsed.prepNote ?? item.prepNote,
              // Only replace the section if it is still the blank default.
              grocerySection:
                item.grocerySection === 'Pantry' ? parsed.grocerySection : item.grocerySection,
            }
      )
    );
  };

  // ---- Instructions ----

  const updateInstruction = (index: number, value: string) => {
    const updated = form.instructions.map((step, i) => (i === index ? value : step));
    setField('instructions', updated);
  };

  const addInstruction = () => {
    setField('instructions', [...form.instructions, '']);
  };

  const removeInstruction = (index: number) => {
    setField('instructions', form.instructions.filter((_, i) => i !== index));
  };

  const moveInstruction = (index: number, dir: 'up' | 'down') => {
    const arr = [...form.instructions];
    const swapWith = dir === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= arr.length) return;
    [arr[index], arr[swapWith]] = [arr[swapWith], arr[index]];
    setField('instructions', arr);
  };

  // ---- Validation & Save ----

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Recipe name is required.');
    if (!form.description.trim()) errs.push('Description is required.');
    if (form.ingredients.some((ing) => !ing.name.trim())) {
      errs.push('All ingredients must have a name.');
    }
    if (form.instructions.some((step) => !step.trim())) {
      errs.push('All instruction steps must have text.');
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    // Parse tags from comma-separated input
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onSave({ ...form, tags });
    onClose();
  };

  // Shared input class
  const inputCls =
    'w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-primary-400 transition-colors';

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-start justify-center sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-3xl sm:rounded-2xl rounded-t-2xl shadow-2xl sm:my-4 max-h-[95vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-5 rounded-t-2xl flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-stone-800">
            {recipe ? '✏️ Edit Recipe' : '➕ Add New Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-amber-200 hover:bg-amber-100 flex items-center justify-center text-lg text-stone-600 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto">

          {/* URL Import */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-3">🔗 Import from URL</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => { setImportUrl(e.target.value); setImportStatus('idle'); }}
                onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
                placeholder="Paste a recipe URL (AllRecipes, Food Network, NYT Cooking…)"
                className="flex-1 px-3 py-3 sm:py-2.5 border-2 border-amber-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 transition-colors bg-white"
              />
              <button
                type="button"
                onClick={handleImportUrl}
                disabled={importStatus === 'loading' || !importUrl.trim()}
                className="px-4 py-3 sm:py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {importStatus === 'loading' ? '⏳ Importing…' : 'Import'}
              </button>
            </div>
            {importStatus === 'error' && (
              <p className="text-red-600 text-xs mt-2 leading-relaxed whitespace-pre-line">{importError}</p>
            )}
            <p className="text-stone-400 text-xs mt-2">Fills in the form automatically — you can review and edit before saving.</p>
          </section>

          {/* ChatGPT Import Helper */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-2">🤖 Import with ChatGPT</h3>
            <p className="text-stone-500 text-xs leading-relaxed mb-3">
              Copy a prompt, paste it into ChatGPT with your recipe URL, text, or image — then paste ChatGPT's reply into <span className="font-semibold">Paste Recipe Text</span> below.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleCopyPrompt('url-text')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white border border-amber-200 text-stone-700 font-semibold rounded-xl text-xs hover:bg-amber-100 hover:border-amber-300 transition-colors active:scale-[0.98]"
              >
                {copiedPrompt === 'url-text' ? (
                  <><span className="text-green-600">✓</span><span className="text-green-700">Prompt copied!</span></>
                ) : (
                  <><span>📋</span><span>Copy Prompt for URL or Text</span></>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleCopyPrompt('image')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white border border-amber-200 text-stone-700 font-semibold rounded-xl text-xs hover:bg-amber-100 hover:border-amber-300 transition-colors active:scale-[0.98]"
              >
                {copiedPrompt === 'image' ? (
                  <><span className="text-green-600">✓</span><span className="text-green-700">Prompt copied!</span></>
                ) : (
                  <><span>🖼️</span><span>Copy Prompt for Image</span></>
                )}
              </button>
            </div>
          </section>

          {/* Paste Recipe Text */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest">📋 Paste Recipe Text</h3>
              <button
                type="button"
                onClick={() => { setShowPastePanel((v) => !v); setPasteText(''); }}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 underline transition-colors"
              >
                {showPastePanel ? 'Hide' : 'Open'}
              </button>
            </div>
            {!showPastePanel && (
              <p className="text-stone-400 text-xs mt-1">
                Paste a recipe from any source — we'll fill in the form automatically.
              </p>
            )}
            {showPastePanel && (
              <div className="mt-3 space-y-2">
                <p className="text-stone-500 text-xs leading-relaxed">
                  Paste a recipe from a website, document, email, or notes. Works best when the recipe has clear "Ingredients" and "Instructions" sections.
                </p>
                <textarea
                  autoFocus
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"Mom's Chicken Soup\n\nA cozy family soup.\n\nServes 6\nPrep Time: 15 minutes\nCook Time: 45 minutes\n\nIngredients\n2 lb chicken breast\n1 onion, diced\n\nInstructions\n1. Dice the onion.\n2. Add to pot and simmer."}
                  rows={12}
                  className="w-full px-3 py-2.5 border-2 border-amber-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 transition-colors bg-white resize-y font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleParseText}
                    disabled={!pasteText.trim()}
                    className="flex-1 py-3 sm:py-2.5 bg-primary-600 text-white font-bold rounded-xl text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors active:scale-[0.98]"
                  >
                    ✨ Parse Recipe
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPastePanel(false); setPasteText(''); }}
                    className="py-3 sm:py-2.5 px-4 bg-white border border-amber-200 text-stone-600 font-semibold rounded-xl text-sm hover:bg-amber-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Photo upload */}
          <section>
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-widest mb-3">📷 Photo</h3>
            {form.image ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-amber-200">
                <img src={form.image} alt="Recipe" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setField('image', undefined as unknown as string)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-500 text-xs font-bold px-3 py-1.5 rounded-full shadow transition-colors"
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-amber-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-amber-50 transition-all text-stone-400 hover:text-primary-500">
                <span className="text-3xl mb-1">{photoUploading ? '⏳' : '📷'}</span>
                <span className="text-sm font-semibold">{photoUploading ? 'Processing…' : 'Click to upload a photo'}</span>
                <span className="text-xs mt-0.5">JPG, PNG — will be compressed automatically</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            )}
          </section>

          {/* Parse success notice */}
          {parseNotice && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-green-500 text-lg flex-shrink-0">✓</span>
              <div className="flex-1">
                <p className="text-green-800 font-semibold text-sm">Recipe text parsed!</p>
                <p className="text-green-700 text-xs mt-0.5">We filled in what we could — please review before saving.</p>
              </div>
              <button
                onClick={() => setParseNotice(false)}
                className="text-green-400 hover:text-green-600 transition-colors flex-shrink-0 text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-bold text-red-700 mb-1">Please fix these issues:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-red-600 text-sm">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic info */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">Basic Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Mom's Chicken Soup"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="A brief description of the dish..."
                  rows={2}
                  className={inputCls + ' resize-none'}
                />
              </div>
            </div>
          </section>

          {/* Classification */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">Classification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setField('difficulty', e.target.value as DifficultyLevel)}
                  className={inputCls}
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Category</label>
                <select
                  value={form.proteinType}
                  onChange={(e) => setField('proteinType', e.target.value as ProteinType)}
                  className={inputCls}
                >
                  {PROTEIN_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Meal Type</label>
                <select
                  value={form.mealType}
                  onChange={(e) => setField('mealType', e.target.value as MealType)}
                  className={inputCls}
                >
                  {MEAL_TYPE_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Time & Servings */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">Time & Servings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Prep (min)</label>
                <input
                  type="number"
                  min={0}
                  value={form.prepTimeMinutes}
                  onChange={(e) => setField('prepTimeMinutes', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Cook (min)</label>
                <input
                  type="number"
                  min={0}
                  value={form.cookTimeMinutes}
                  onChange={(e) => setField('cookTimeMinutes', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Total (min)</label>
                <input
                  type="number"
                  min={0}
                  value={form.totalTimeMinutes}
                  onChange={(e) => setField('totalTimeMinutes', Number(e.target.value))}
                  className={inputCls + ' bg-gray-50'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Servings</label>
                <input
                  type="number"
                  min={1}
                  value={form.defaultServings}
                  onChange={(e) => setField('defaultServings', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Tags */}
          <section>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="weeknight, kid-friendly, quick"
              className={inputCls}
            />
          </section>

          {/* Ingredients */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">
              Ingredients ({form.ingredients.length})
            </h3>
            <div className="space-y-3">
              {form.ingredients.map((ing, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    {/* Name */}
                    <div className="col-span-12 sm:col-span-5">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                        onBlur={() => handleIngredientNameBlur(idx)}
                        placeholder="Ingredient name *"
                        className={inputCls}
                      />
                    </div>
                    {/* Quantity */}
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        className={inputCls}
                      />
                    </div>
                    {/* Unit */}
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                        placeholder="Unit"
                        className={inputCls}
                      />
                    </div>
                    {/* Grocery section */}
                    <div className="col-span-4 sm:col-span-3">
                      <select
                        value={ing.grocerySection}
                        onChange={(e) =>
                          updateIngredient(idx, 'grocerySection', e.target.value as GrocerySection)
                        }
                        className={inputCls}
                      >
                        {GROCERY_SECTION_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {/* Prep note */}
                    <input
                      type="text"
                      value={ing.prepNote || ''}
                      onChange={(e) => updateIngredient(idx, 'prepNote', e.target.value)}
                      placeholder="Prep note (optional, e.g. diced)"
                      className={inputCls + ' flex-1'}
                    />
                    {/* Remove ingredient */}
                    {form.ingredients.length > 1 && (
                      <button
                        onClick={() => removeIngredient(idx)}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center font-bold transition-colors"
                        title="Remove ingredient"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addIngredient}
              className="mt-3 w-full py-2.5 border-2 border-dashed border-primary-300 text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-base"
            >
              + Add Ingredient
            </button>
          </section>

          {/* Instructions */}
          <section>
            <h3 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">
              Instructions ({form.instructions.length} steps)
            </h3>
            <div className="space-y-3">
              {form.instructions.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-1">
                    {idx + 1}
                  </span>
                  <textarea
                    value={step}
                    onChange={(e) => updateInstruction(idx, e.target.value)}
                    placeholder={`Step ${idx + 1}...`}
                    rows={2}
                    className={inputCls + ' flex-1 resize-none'}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveInstruction(idx, 'up')}
                      disabled={idx === 0}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 text-xs flex items-center justify-center"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveInstruction(idx, 'down')}
                      disabled={idx === form.instructions.length - 1}
                      className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-30 text-xs flex items-center justify-center"
                      title="Move down"
                    >
                      ▼
                    </button>
                    {form.instructions.length > 1 && (
                      <button
                        onClick={() => removeInstruction(idx)}
                        className="w-7 h-7 rounded bg-red-100 text-red-500 hover:bg-red-200 text-xs flex items-center justify-center"
                        title="Remove step"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addInstruction}
              className="mt-3 w-full py-2.5 border-2 border-dashed border-primary-300 text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-base"
            >
              + Add Step
            </button>
          </section>

          {/* Notes */}
          <section>
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              Tips & Notes (optional)
            </label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Any extra tips, substitutions, or notes..."
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </section>
        </div>

        {/* Footer buttons */}
        <div className="px-5 sm:px-6 pb-6 pt-3 flex gap-3 border-t border-stone-100 bg-white sticky bottom-0">
          <button
            onClick={handleSave}
            className="flex-1 py-4 sm:py-3 px-6 bg-primary-500 text-white font-bold rounded-xl text-base hover:bg-primary-600 transition-colors shadow-md active:scale-[0.98]"
          >
            {recipe ? '💾 Save Changes' : '✓ Add Recipe'}
          </button>
          <button
            onClick={onClose}
            className="py-4 sm:py-3 px-6 bg-gray-100 text-gray-700 font-bold rounded-xl text-base hover:bg-gray-200 transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
