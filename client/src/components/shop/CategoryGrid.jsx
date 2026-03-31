// Category grid — Blinkit-style visual category cards for homepage
// Shows category icon + name in a responsive grid, click to browse
// Categories with subcategories navigate to subcategory page

import { useNavigate } from 'react-router-dom';

const CategoryGrid = ({ categories, categoriesWithSubs = new Set() }) => {
  const navigate = useNavigate();

  const handleClick = (cat) => {
    if (cat.slug === 'print-store') {
      navigate('/print-store');
    } else if (categoriesWithSubs.has(cat.slug)) {
      navigate(`/category/${cat.slug}/sub`);
    } else {
      navigate(`/category/${cat.slug}`);
    }
  };

  return (
    <section className="home-section">
      <div className="section-title-row">
        <h2 className="section-heading">Shop by Category</h2>
      </div>
      <div className="category-grid">
        {categories.map((cat) => (
          <div
            key={cat._id}
            className="category-card-wrap"
            onClick={() => handleClick(cat)}
          >
            <div className="category-card" style={{ background: 'rgb(229 243 243)' }}>
              {cat.image ? (
                <img className="category-card-img" src={cat.image} alt={cat.name} loading="lazy" />
              ) : (
                <span className="category-card-icon">{cat.icon}</span>
              )}
            </div>
            <span className="category-card-name">{cat.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
