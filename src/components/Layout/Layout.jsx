import React, { useState } from 'react';

import { useStudy } from '../../context/StudyContext';

import Sidebar from './Sidebar';

import Topbar from './Topbar';

import Dashboard from '../Dashboard/Dashboard';

import Banco from '../Banco/Banco';

import Upload from '../Upload/Upload';

import Gerador from '../Gerador/Gerador';

import Simulado from '../Simulados/Simulado';

import Revisao from '../Revisao/Revisao';

import Flashcards from '../Flashcards/Flashcards';

import Desempenho from '../Desempenho/Desempenho';

import Cobertura from '../Cobertura/Cobertura';

import Config from '../Config/Config';



const Layout = () => {

  const { currentView, isLoading } = useStudy();

  const [sidebarOpen, setSidebarOpen] = useState(false);



  const toggleSidebar = () => {

    setSidebarOpen(!sidebarOpen);

  };



  if (isLoading) {

    return (

      <div id="init-screen">

        <div className="i-logo">StudyPRO</div>

        <div className="spin"></div>

        <div id="init-msg">Conectando ao Firebase...</div>

      </div>

    );

  }



  const renderView = () => {

    switch (currentView) {

      case 'dashboard':

        return <Dashboard />;

      case 'banco':

        return <Banco />;

      case 'upload':

        return <Upload />;

      case 'gerador':

        return <Gerador />;

      case 'simulado':

        return <Simulado />;

      case 'revisao':

        return <Revisao />;

      case 'flashcards':

        return <Flashcards />;

      case 'desempenho':

        return <Desempenho />;

      case 'cobertura':

        return <Cobertura />;

      case 'config':

        return <Config />;

      default:

        return <Dashboard />;

    }

  };



  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar currentView={currentView} onToggleSidebar={toggleSidebar} />
        <div className="content">
          {renderView()}
        </div>
      </div>
    </div>
  );

};



export default Layout;