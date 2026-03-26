// Horizontal scrollable category filter bar

const CategoryBar = ({ categories, active, onSelect }) => {
  return (
    <div className="category-bar">
      <button
        className={`category-chip ${!active ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat._id}
          className={`category-chip ${active === cat.slug ? 'active' : ''}`}
          onClick={() => onSelect(cat.slug)}
        >
          <span>{cat.icon}</span> {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
