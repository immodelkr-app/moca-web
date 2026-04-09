const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_\.]+)/gi;
  
  const newContent = content.replace(regex, (match, p1, p2) => {
    // Check if there's already a DROP POLICY IF EXISTS right before it
    const dropSubstring = `DROP POLICY IF EXISTS "${p1}" ON ${p2};`;
    if (content.includes(dropSubstring)) {
      return match; // already handled
    }
    return `DROP POLICY IF EXISTS "${p1}" ON ${p2};\n${match}`;
  });
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed', f);
  }
});
