import React, { useState, useRef, useEffect } from 'react';
import './HamburgerMenuDemo.css';

export default function HamburgerMenuDemo() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        buttonRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div style={{ position: 'relative', minHeight: 120, padding: 40 }}>
      <button
        ref={buttonRef}
        className="hamburger-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="true"
        style={{ position: 'absolute', top: 0, right: 0 }}
      >
        <span /><span /><span />
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className="hamburger-dropdown"
          style={{ position: 'absolute', top: 40, right: 0, zIndex: 9999 }}
        >
          <button>Menu Item 1</button>
          <button>Menu Item 2</button>
          <button>Menu Item 3</button>
        </div>
      )}
    </div>
  );
}
