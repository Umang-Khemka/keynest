function App() {
  return (
    <main className="popup">
      <header className="popup__header">
        <img src="/icon/48.png" alt="" width={24} height={24} />
        <h1>KeyNest</h1>
      </header>
      <p className="popup__status">Vault not set up yet.</p>
      <p className="popup__hint">
        Phase 0 scaffold. Vault creation arrives in Phase 1.
      </p>
    </main>
  );
}

export default App;
