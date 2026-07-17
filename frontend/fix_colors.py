import re

file_path = "/Users/rafaelsuzano/Projetos/SuzanoIT/orcamentos/frontend/src/pages/fleet/FleetVehicles.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Substitutions mapping
replacements = [
    # text colors
    (r'text-(indigo|violet)-[6789]00\b', 'text-primary'),
    (r'text-(indigo|violet)-500\b', 'text-primary'),
    (r'text-(indigo|violet)-400\b', 'text-primary'),
    (r'text-(indigo|violet)-300\b', 'text-primary/70'),
    (r'text-(indigo|violet)-[12]00\b', 'text-primary-foreground'),
    (r'text-(indigo|violet)-50\b', 'text-primary-foreground'),
    
    # background colors
    (r'bg-(indigo|violet)-[5678]00\b', 'bg-primary'),
    (r'bg-(indigo|violet)-400\b', 'bg-primary/80'),
    (r'bg-(indigo|violet)-300\b', 'bg-primary/60'),
    (r'bg-(indigo|violet)-200\b', 'bg-primary/30'),
    (r'bg-(indigo|violet)-100\b', 'bg-primary/20'),
    (r'bg-(indigo|violet)-50\b', 'bg-primary/10'),
    (r'bg-(indigo|violet)-9[05]0\b', 'bg-primary/10'),
    
    # borders
    (r'border-(indigo|violet)-[5678]00\b', 'border-primary'),
    (r'border-(indigo|violet)-[34]00\b', 'border-primary/50'),
    (r'border-(indigo|violet)-[12]00\b', 'border-primary/30'),
    (r'border-(indigo|violet)-50\b', 'border-primary/20'),
    (r'border-(indigo|violet)-9[05]0\b', 'border-primary/20'),
    
    # gradients
    (r'from-(indigo|violet)-[5678]00\b', 'from-primary'),
    (r'via-(indigo|violet)-[5678]00\b', 'via-primary/80'),
    (r'to-(indigo|violet)-[5678]00\b', 'to-primary/60'),
    
    (r'from-(indigo|violet)-[1234]00\b', 'from-primary/20'),
    (r'via-(indigo|violet)-[1234]00\b', 'via-primary/15'),
    (r'to-(indigo|violet)-[1234]00\b', 'to-primary/10'),

    (r'from-(indigo|violet)-50\b', 'from-primary/10'),
    (r'via-(indigo|violet)-50\b', 'via-primary/5'),
    (r'to-(indigo|violet)-50\b', 'to-transparent'),
    
    (r'from-(indigo|violet)-9[05]0\b', 'from-primary/10'),
    (r'via-(indigo|violet)-9[05]0\b', 'via-primary/5'),
    (r'to-(indigo|violet)-9[05]0\b', 'to-transparent'),

    # rings and shadows
    (r'ring-(indigo|violet)-[56]00\b', 'ring-primary'),
    (r'shadow-(indigo|violet)-[56]00\b', 'shadow-primary'),
    (r'shadow-(indigo|violet)-500/20\b', 'shadow-primary/20'),
    
    # Specific opacity cases that might be left over
    (r'(bg|text|border|ring|shadow)-primary/(\d+)/(\d+)', r'\1-primary/\2'), # Fix weird double opacities if any
]

for pattern, repl in replacements:
    content = re.sub(pattern, repl, content)

# Some extra cleanup for specific bad classes that might arise from regex
content = re.sub(r'bg-primary/10/(\d+)', r'bg-primary/10', content)
content = re.sub(r'bg-primary/20/(\d+)', r'bg-primary/20', content)
content = re.sub(r'text-primary/(\d+)/(\d+)', r'text-primary', content)
content = re.sub(r'border-primary/(\d+)/(\d+)', r'border-primary/50', content)
content = re.sub(r'dark:bg-primary/10', r'dark:bg-primary/20', content) # Enhance contrast in dark mode

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Colors updated successfully in FleetVehicles.tsx")
