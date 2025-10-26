class TrelloBoard {
  constructor() {
    this.columns = document.querySelectorAll(".column");
    this.localStorageKey = "trelloBoardState";
    this.state = JSON.parse(localStorage.getItem(this.localStorageKey)) || {
      column1: [],
      column2: [],
      column3: [],
    };

    // Initialize modal elements
    this.modalOverlay = document.getElementById("modalOverlay");
    this.modalTitle = document.getElementById("modalTitle");
    this.modalTextarea = document.getElementById("modalTextarea");
    this.modalSave = document.getElementById("modalSave");
    this.modalCancel = document.getElementById("modalCancel");
    this.modalClose = document.getElementById("modalClose");

    this.modalSaveCallback = null;

    this.initModalListeners();
    this.renderCards();
    this.addCardListeners();
    this.initDragAndDrop();
  }

  renderCards() {
    this.columns.forEach((column) => {
      const columnId = column.id;
      const cardsContainer = column.querySelector(".cards");
      cardsContainer.innerHTML = "";
      this.state[columnId].forEach((cardText, index) => {
        const card = this.createCard(columnId, cardText, index);
        cardsContainer.appendChild(card);
      });
    });
  }

  createCard(columnId, cardText, index) {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = cardText;
    card.dataset.column = columnId;
    card.dataset.index = index;

    // Добавляем кнопки после текста
    const editButton = document.createElement("span");
    editButton.className = "edit-card";
    editButton.textContent = "✎";
    editButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.editCard(columnId, index);
    });
    card.appendChild(editButton);

    const deleteButton = document.createElement("span");
    deleteButton.className = "delete-card";
    deleteButton.textContent = "✖";
    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.deleteCard(columnId, index);
    });
    card.appendChild(deleteButton);

    // Добавляем обработчик для начала перетаскивания
    card.addEventListener("mousedown", (e) => this.dragStart(e));
    return card;
  }

  addCardListeners() {
    document.querySelectorAll(".add-card").forEach((addCardButton) => {
      addCardButton.addEventListener("click", () => {
        this.showModal("Add Card", "", (text) => {
          if (text.trim()) {
            const columnId = addCardButton.parentElement.id;
            this.state[columnId].push(text.trim());
            this.saveState();
            this.renderCards();
          }
        });
      });
    });
  }

  deleteCard(columnId, index) {
    this.state[columnId].splice(index, 1);
    this.saveState();
    this.renderCards();
  }

  editCard(columnId, index) {
    const currentText = this.state[columnId][index];
    this.showModal("Edit Card", currentText, (newText) => {
      if (newText !== null && newText.trim()) {
        this.state[columnId][index] = newText.trim();
        this.saveState();
        this.renderCards();
      }
    });
  }

  showModal = (title, initialText, onSave) => {
    this.modalTitle.textContent = title;
    this.modalTextarea.value = initialText;
    this.modalSaveCallback = onSave;
    this.modalOverlay.classList.add("active");
    this.modalTextarea.focus();
    this.modalTextarea.select();
  };

  hideModal = () => {
    this.modalOverlay.classList.remove("active");
    this.modalSaveCallback = null;
    this.modalTextarea.value = "";
  };

  validateAndSave = () => {
    const text = this.modalTextarea.value.trim();
    if (text) {
      if (this.modalSaveCallback) {
        this.modalSaveCallback(text);
      }
      this.hideModal();
    } else {
      this.modalTextarea.focus();
      this.modalTextarea.style.borderColor = "#ff4444";
      setTimeout(() => {
        this.modalTextarea.style.borderColor = "";
      }, 2000);
    }
  };

  initModalListeners() {
    // Save button
    this.modalSave.addEventListener("click", () => {
      this.validateAndSave();
    });

    // Cancel button
    this.modalCancel.addEventListener("click", () => {
      this.hideModal();
    });

    // Close button (X)
    this.modalClose.addEventListener("click", () => {
      this.hideModal();
    });

    // Overlay click (close on background click)
    this.modalOverlay.addEventListener("click", (e) => {
      if (e.target === this.modalOverlay) {
        this.hideModal();
      }
    });

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.modalOverlay.classList.contains("active")
      ) {
        this.hideModal();
      }
    });

    // Ctrl+Enter / Cmd+Enter to save
    this.modalTextarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.validateAndSave();
      }
    });
  }

  dragStart(e) {
    // Не начинаем перетаскивание при клике на кнопки
    if (
      e.target.classList.contains("edit-card") ||
      e.target.classList.contains("delete-card") ||
      e.button !== 0
    )
      return; // Только левая кнопка мыши

    e.preventDefault();

    this.draggedCard = e.target.closest(".card");
    if (!this.draggedCard) return;

    this.sourceColumnId = this.draggedCard.dataset.column;
    this.sourceColumn = this.draggedCard.closest(".column");

    // Сохраняем позицию курсора относительно карточки
    this.dragOffset = {
      x: e.clientX - this.draggedCard.getBoundingClientRect().left,
      y: e.clientY - this.draggedCard.getBoundingClientRect().top,
    };

    // Создаем клон карточки для визуального эффекта
    this.cardClone = this.draggedCard.cloneNode(true);
    this.cardClone.classList.add("dragging");
    this.cardClone.style.position = "absolute";
    this.cardClone.style.zIndex = 1000;
    this.cardClone.style.width = this.draggedCard.offsetWidth + "px";
    this.cardClone.style.pointerEvents = "none";
    document.body.appendChild(this.cardClone);

    this.updateCardPosition(e);
    this.draggedCard.style.opacity = "0.5";

    document.addEventListener("mousemove", this.dragMove.bind(this));
    document.addEventListener("mouseup", this.dragEnd.bind(this));
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }

  dragMove(e) {
    if (!this.draggedCard || !this.cardClone) return;
    e.preventDefault();

    this.updateCardPosition(e);
    this.showDropIndicator(e);
  }

  dragEnd(e) {
    if (!this.draggedCard || !this.cardClone) return;

    document.removeEventListener("mousemove", this.dragMove.bind(this));
    document.removeEventListener("mouseup", this.dragEnd.bind(this));
    document.body.style.cursor = "default";
    document.body.style.userSelect = "";

    this.hideDropIndicator();

    const targetColumn = this.getTargetColumn(e);
    if (targetColumn) {
      this.moveCard(targetColumn, e);
    }

    // Удаляем клон
    if (this.cardClone && this.cardClone.parentNode) {
      this.cardClone.parentNode.removeChild(this.cardClone);
    }
    this.cardClone = null;

    // Восстанавливаем исходную карточку
    if (this.draggedCard) {
      this.draggedCard.style.opacity = "1";
      this.draggedCard = null;
    }
    this.sourceColumnId = null;
    this.sourceColumn = null;
  }

  updateCardPosition(e) {
    if (!this.cardClone) return;

    this.cardClone.style.left = e.clientX - this.dragOffset.x + "px";
    this.cardClone.style.top = e.clientY - this.dragOffset.y + "px";
  }

  showDropIndicator(e) {
    this.hideDropIndicator();

    const targetColumn = this.getTargetColumn(e);
    if (!targetColumn) return;

    const cardsContainer = targetColumn.querySelector(".cards");
    const afterElement = this.getDragAfterElement(cardsContainer, e.clientY);

    // Получаем первую карточку для расчета ширины индикатора
    const firstCard = cardsContainer.querySelector(".card");
    let indicatorWidth, indicatorLeft;

    if (firstCard) {
      const cardRect = firstCard.getBoundingClientRect();
      const containerRect = cardsContainer.getBoundingClientRect();
      indicatorWidth = cardRect.width;
      indicatorLeft = cardRect.left - containerRect.left;
    } else {
      // Пустая колонка - используем ширину контейнера минус padding
      const containerRect = cardsContainer.getBoundingClientRect();
      indicatorWidth = containerRect.width - 24; // 12px отступы с каждой стороны
      indicatorLeft = 12;
    }

    if (afterElement == null) {
      // Вставка в конец
      const cards = cardsContainer.querySelectorAll(".card");
      if (cards.length > 0) {
        // Вставка после последней карточки
        const lastCard = cards[cards.length - 1];
        const rect = lastCard.getBoundingClientRect();
        const containerRect = cardsContainer.getBoundingClientRect();

        this.dropIndicator = {
          element: document.createElement("div"),
          position: "after",
        };
        this.dropIndicator.element.className = "drop-indicator";
        this.dropIndicator.element.style.cssText = `
          position: absolute;
          height: 4px;
          background-color: #0079bf;
          width: ${indicatorWidth}px;
          left: ${indicatorLeft}px;
          top: ${rect.bottom - containerRect.top + 12}px;
          border-radius: 2px;
          pointer-events: none;
          z-index: 999;
        `;
      } else {
        // Пустая колонка
        this.dropIndicator = {
          element: document.createElement("div"),
          position: "after",
        };
        this.dropIndicator.element.className = "drop-indicator";
        this.dropIndicator.element.style.cssText = `
          position: absolute;
          height: 4px;
          background-color: #0079bf;
          width: ${indicatorWidth}px;
          left: ${indicatorLeft}px;
          top: 12px;
          border-radius: 2px;
          pointer-events: none;
          z-index: 999;
        `;
      }
      cardsContainer.appendChild(this.dropIndicator.element);
    } else {
      // Вставка перед элементом
      const rect = afterElement.getBoundingClientRect();
      const containerRect = cardsContainer.getBoundingClientRect();

      this.dropIndicator = {
        element: document.createElement("div"),
        position: "before",
        targetElement: afterElement,
      };
      this.dropIndicator.element.className = "drop-indicator";
      this.dropIndicator.element.style.cssText = `
        position: absolute;
        height: 4px;
        background-color: #0079bf;
        width: ${indicatorWidth}px;
        left: ${indicatorLeft}px;
        top: ${rect.top - containerRect.top - 6}px;
        border-radius: 2px;
        pointer-events: none;
        z-index: 999;
      `;
      cardsContainer.appendChild(this.dropIndicator.element);
    }
  }

  hideDropIndicator() {
    if (this.dropIndicator && this.dropIndicator.element.parentNode) {
      this.dropIndicator.element.parentNode.removeChild(
        this.dropIndicator.element,
      );
    }
    this.dropIndicator = null;
  }

  getTargetColumn(e) {
    const column = e.target.closest(".column");
    if (column && column.querySelector(".cards")) {
      return column;
    }
    return null;
  }

  getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll('.card:not([style*="opacity: 0.5"])'),
    ];

    return (
      draggableElements.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - (box.top + box.height / 2);
          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          } else {
            return closest;
          }
        },
        { offset: Number.NEGATIVE_INFINITY },
      ).element || null
    );
  }

  moveCard(targetColumn, e) {
    const targetColumnId = targetColumn.id;
    const cardsContainer = targetColumn.querySelector(".cards");
    const cardText = this.draggedCard.textContent
      .replace("✖", "")
      .replace("✎", "")
      .trim();

    // Удаляем из исходной колонки
    const sourceColumnIndex = this.state[this.sourceColumnId].indexOf(cardText);
    if (sourceColumnIndex !== -1) {
      this.state[this.sourceColumnId].splice(sourceColumnIndex, 1);
    }

    // Добавляем в целевую колонку в правильную позицию
    const afterElement = this.getDragAfterElement(cardsContainer, e.clientY);
    if (afterElement == null) {
      this.state[targetColumnId].push(cardText);
    } else {
      const targetElements = [
        ...cardsContainer.querySelectorAll(
          '.card:not([style*="opacity: 0.5"])',
        ),
      ];
      const targetIndex = targetElements.indexOf(afterElement);
      this.state[targetColumnId].splice(targetIndex, 0, cardText);
    }

    this.saveState();
    this.renderCards();
  }

  saveState() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.state));
  }
}

export default TrelloBoard;
