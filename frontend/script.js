const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
let books = [];

// Load books
async function fetchBooks() {
  try {
    const res = await fetch('http://localhost:3000/api/books');
    books = await res.json();

    populateCategoryFilter(books);
    displayBooks(books);

    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
  } catch (err) {
    console.error('Failed to load books:', err);
    booksGrid.innerHTML = '<p class="error">Failed to load books from server.</p>';
  }
}

function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filtered = books.filter(book => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm) ||
      (book.category && book.category.toLowerCase().includes(searchTerm));
    const matchesCategory = !selectedCategory || book.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  displayBooks(filtered);
}

function populateCategoryFilter(books) {
  const categories = [...new Set(books.map(book => book.category).filter(Boolean))];
  categoryFilter.innerHTML = `<option value="">Sort</option>`;
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
}

function displayBooks(bookList) {
  booksGrid.innerHTML = '';

  if (bookList.length === 0) {
    booksGrid.innerHTML = '<p class="no-books">No books found.</p>';
    return;
  }

  bookList.forEach(book => {
    const avgRating = calculateAverageRating(book.ratings);
    const bookDiv = document.createElement('div');
    bookDiv.className = 'book-card styled colorful';

    bookDiv.innerHTML = `
      <div class="book-intro-tooltip">${book.introduction || 'No introduction available.'}</div>
      <div class="book-image-wrapper">
        <img src="http://localhost:3000${book.coverImage}" alt="${book.title}" />
      </div>
      <div class="book-info">
        <h3>${book.title}</h3>
        <p class="author">by ${book.author}</p>
        <p class="category">🏷️ ${book.category || 'Uncategorized'}</p>
        <div class="stars" data-book-id="${book._id}">
          ${renderStars(avgRating, book)}
        </div>
        <p class="rating">⭐ ${avgRating.toFixed(1)} / 5</p>
        <button class="read-btn" onclick="readBook('${book._id}')">📖 Read</button>
      </div>
    `;
    booksGrid.appendChild(bookDiv);
  });

  attachRatingEvents();
}

function calculateAverageRating(ratings = []) {
  if (!ratings || ratings.length === 0) return 0;
  const total = ratings.reduce((sum, r) => sum + r.value, 0);
  return total / ratings.length;
}

function renderStars(avgRating, book) {
  const userId = getUserIdFromToken();
  const ratings = book.ratings || [];
  const userRating = ratings.find(r => r.userId === userId)?.value || 0;

  let starsHTML = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= (userRating || Math.round(avgRating));
    starsHTML += `<span class="star" data-value="${i}" style="cursor:pointer; color:${filled ? '#fbbf24' : '#ccc'};">★</span>`;
  }
  return starsHTML;
}

function attachRatingEvents() {
  const allStars = document.querySelectorAll('.stars');

  allStars.forEach(container => {
    const bookId = container.dataset.bookId;
    const stars = container.querySelectorAll('.star');

    stars.forEach(star => {
      star.addEventListener('click', async () => {
        const ratingValue = parseInt(star.dataset.value);
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in to rate books.');
          window.location.href = 'login.html';
          return;
        }

        try {
          const res = await fetch(`http://localhost:3000/api/books/${bookId}/rate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ value: ratingValue })
          });

          if (res.ok) {
            await fetchBooks();
          } else {
            const result = await res.json();
            alert('Rating failed: ' + result.error);
          }
        } catch (err) {
          console.error('Rating error:', err);
          alert('Error rating book');
        }
      });
    });
  });
}

function getUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

function readBook(bookId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in to read books.');
    window.location.href = 'login.html';
    return;
  }
  window.location.href = `book.html?id=${bookId}`;
}

// Sidebar toggle
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.querySelector('.menu-btn');
  if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
    sidebar.classList.remove('active');
  }
});

// Load token info on load
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const sidebarToggle = document.querySelector('.menu-btn');
  const authLinks = document.getElementById('authLinks');
  const sidebar = document.getElementById('sidebar');
  const userEmail = document.getElementById('userEmail');

  if (token) {
    sidebarToggle.style.display = 'block';
    authLinks.style.display = 'none';

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userEmail.textContent = payload.email || 'Logged in';
    } catch (e) {
      userEmail.textContent = 'Logged in';
    }
  } else {
    sidebarToggle.style.display = 'block';
    authLinks.style.display = 'flex';
    sidebar.style.display = 'none';
  }
});

fetchBooks();
