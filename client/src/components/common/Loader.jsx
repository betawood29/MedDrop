// Full-screen and inline loading spinner

const Loader = ({ fullscreen = false, text = 'Loading...' }) => {
  if (fullscreen) {
    return (
      <div className="loader-fullscreen">
        <div className="spinner" />
        <p>{text}</p>
      </div>
    );
  }

  return (
    <div className="loader-inline">
      <div className="spinner" />
      {text && <p>{text}</p>}
    </div>
  );
};

export default Loader;
