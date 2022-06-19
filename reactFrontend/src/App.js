import './App.css';
import { useState } from 'react';
import NavBar from './NavBar';
import GameLogic from './GameLogic';

function App() {
  const [accounts, setAccounts] = useState([]);
  return (
  <div className="App">
    <NavBar accounts={accounts} setAccounts={setAccounts} />
    <GameLogic accounts={accounts} setAccounts={setAccounts} />
  </div>
  );
}

export default App;
