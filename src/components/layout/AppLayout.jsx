import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-8">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-3 py-3 md:px-6 md:py-5">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}