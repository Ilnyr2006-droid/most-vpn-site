"use client";

import { useState } from "react";

const items = [
  ["Какие устройства поддерживаются?", "Поддерживаются iPhone, Android, Windows, macOS и Linux."],
  ["Сложно подключиться?", "Нет. Обычно установка и подключение занимают пару минут."],
  ["Можно подключить несколько устройств?", "Да. Один тариф включает до трёх устройств одновременно."],
  ["Что делать, если не подключается?", "В приложении будет простая инструкция, а при необходимости можно написать в поддержку."],
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {items.map(([q, a], i) => (
        <button className={`faq-row ${open === i ? "is-open" : ""}`} key={q} onClick={() => setOpen(open === i ? null : i)}>
          <span className="faq-index mono">0{i + 1}</span>
          <span className="faq-copy"><strong>{q}</strong><span>{a}</span></span>
          <span className="faq-plus">{open === i ? "−" : "+"}</span>
        </button>
      ))}
    </div>
  );
}
