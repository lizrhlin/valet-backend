-- View para ver categorias do profissional com nomes
SELECT 
    pc.id,
    u.name as professional_name,
    u.email as professional_email,
    c.name as category_name,
    c.icon as category_icon,
    pc."createdAt"
FROM professional_categories pc
JOIN users u ON pc."professionalId" = u.id
JOIN categories c ON pc."categoryId" = c.id
ORDER BY u.name, c.name;

-- View para ver subcategorias do profissional com nomes e preços
SELECT 
    ps.id,
    u.name as professional_name,
    u.email as professional_email,
    c.name as category_name,
    s.name as subcategory_name,
    ps.price,
    ps.description,
    ps."isActive",
    ps."createdAt"
FROM professional_subcategories ps
JOIN users u ON ps."professionalId" = u.id
JOIN subcategories s ON ps."subcategoryId" = s.id
JOIN categories c ON s."categoryId" = c.id
ORDER BY u.name, c.name, s.name;
