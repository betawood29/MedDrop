// Category grid — Blinkit-style visual category cards for homepage
// Shows category icon + name in a responsive grid, click to browse

import { useNavigate } from 'react-router-dom';

const CATEGORY_COLORS = {
  medicines: '#FEF3C7',
  snacks: '#FEE2E2',
  'personal-care': '#E0E7FF',
  beverages: '#D1FAE5',
  stationery: '#F3E8FF',
  essentials: '#DBEAFE',
  'print-store': '#FCE7F3',
};

const CategoryGrid = ({ categories }) => {
  const navigate = useNavigate();

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
            onClick={() => {
              if (cat.slug === 'print-store') {
                navigate('/print-store');
              } else {
                navigate(`/category/${cat.slug}`);
              }
            }}
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
