// Inventory Manager Core Functionality
const ITEMS_KEY = 'inventoryItems';

// DOM Elements
const addItemForm = document.getElementById('add-item-form');
const itemList = document.getElementById('item-list');

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

function showInstallPrompt() {
  const prompt = document.createElement('div');
  prompt.className = 'app-install-prompt flex justify-between items-center p-4';
  prompt.innerHTML = `
    <span class="mobile-text-lg">Install Inventory Manager?</span>
    <div>
      <button class="btn-primary mr-2" id="install-btn">Install</button>
      <button class="btn-danger" id="dismiss-btn">Dismiss</button>
    </div>
  `;
  document.body.appendChild(prompt);
  
  document.getElementById('install-btn').addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted install');
      }
      prompt.remove();
    });
  });
  
  document.getElementById('dismiss-btn').addEventListener('click', () => {
    prompt.remove();
  });
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (addItemForm) {
    addItemForm.addEventListener('submit', handleAddItem);
  }
  
  if (itemList) {
    renderItems();
  }
});

// New item schema with location support
function getItems() {
  const items = JSON.parse(localStorage.getItem(ITEMS_KEY)) || [];
  return items.map(item => ({
    ...item,
    soldQuantity: item.soldQuantity || 0,
    location: item.location || 'Main Warehouse' // Default location
  }));
}

// Save item to localStorage
function saveItem(item) {
  const items = getItems();
  items.push(item);
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

// Handle form submission with location
function handleAddItem(e) {
  e.preventDefault();
  
  const newItem = {
    id: Date.now().toString(),
    name: document.getElementById('item-name').value,
    category: document.getElementById('item-category').value,
    quantity: parseInt(document.getElementById('item-quantity').value),
    price: parseFloat(document.getElementById('item-price').value),
    location: document.getElementById('item-location').value || 'Main Warehouse',
    description: document.getElementById('item-description').value,
    createdAt: new Date().toISOString()
  };

  saveItem(newItem);
  showAlert('Item added successfully!', 'success');
  addItemForm.reset();
}

// Render all items in the table with location
function renderItems() {
  const items = getItems();
  
  if (items.length === 0) {
    itemList.innerHTML = '<tr><td colspan="6" class="text-center py-4">No items found</td></tr>';
    return;
  }

  itemList.innerHTML = items.map(item => `
    <tr class="hover:bg-gray-50">
      <td class="border px-4 py-2">${item.name}</td>
      <td class="border px-4 py-2">${item.category}</td>
      <td class="border px-4 py-2">${item.location}</td>
      <td class="border px-4 py-2 ${item.quantity < 5 ? 'text-red-500 font-medium' : ''}">
        ${item.quantity} ${item.quantity < 5 ? '(Low Stock)' : ''}
      </td>
      <td class="border px-4 py-2">$${item.price.toFixed(2)}</td>
      <td class="border px-4 py-2">
        <button class="btn-primary mr-2" onclick="editItem('${item.id}')">Edit</button>
        <button class="btn-danger" onclick="deleteItem('${item.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Filter items based on search and filters
function filterItems() {
  const searchTerm = document.getElementById('search-bar').value.toLowerCase();
  const categoryFilter = document.getElementById('category-filter').value;
  const locationFilter = document.getElementById('location-filter').value;
  const stockFilter = document.getElementById('stock-filter').value;
  
  const items = getItems();
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                        (item.id && item.id.toLowerCase().includes(searchTerm));
    
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesLocation = !locationFilter || item.location === locationFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = item.quantity < 5;
    } else if (stockFilter === 'out') {
      matchesStock = item.quantity === 0;
    } else if (stockFilter === 'in') {
      matchesStock = item.quantity > 0;
    }
    
    return matchesSearch && matchesCategory && matchesLocation && matchesStock;
  });
  
  renderFilteredItems(filteredItems);
}

// Render filtered items with location
function renderFilteredItems(items) {
  const itemList = document.getElementById('item-list');
  
  if (items.length === 0) {
    itemList.innerHTML = '<tr><td colspan="6" class="text-center py-4">No matching items found</td></tr>';
    return;
  }

  itemList.innerHTML = items.map(item => `
    <tr class="hover:bg-gray-50">
      <td class="border px-4 py-2">${item.name}</td>
      <td class="border px-4 py-2">${item.category}</td>
      <td class="border px-4 py-2">${item.location}</td>
      <td class="border px-4 py-2 ${item.quantity < 5 ? 'text-red-500 font-medium' : ''}">
        ${item.quantity} ${item.quantity < 5 ? '(Low Stock)' : ''}
      </td>
      <td class="border px-4 py-2">$${item.price.toFixed(2)}</td>
      <td class="border px-4 py-2">
        <button class="btn-primary mr-2" onclick="editItem('${item.id}')">Edit</button>
        <button class="btn-danger" onclick="deleteItem('${item.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

// Reset all filters
function resetFilters() {
  document.getElementById('search-bar').value = '';
  document.getElementById('category-filter').value = '';
  document.getElementById('location-filter').value = '';
  document.getElementById('stock-filter').value = '';
  renderItems();
}

// Notification functions
function checkLowStock() {
  const lowStockItems = getItems().filter(item => item.quantity < 5);
  if (lowStockItems.length > 0) {
    const message = `Low stock alert: ${lowStockItems.length} items need restocking`;
    showAlert(message, 'error');
    showBrowserNotification(message);
  }
}

function showBrowserNotification(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Inventory Alert', { body: message });
  }
}

async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');
    }
  }
}

// Show alert message
function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg alert ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white`;
  alert.textContent = message;
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 3000);
}

// Delete item
function deleteItem(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    const items = getItems().filter(item => item.id !== id);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    renderItems();
    showAlert('Item deleted successfully!', 'success');
  }
}

// Edit item (placeholder - to be implemented)
function editItem(id) {
  showAlert('Edit functionality coming soon!', 'info');
}

// Dashboard functionality
function initDashboard() {
  if (document.getElementById('salesChart')) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const salesData = getSalesData();
    new Chart(ctx, {
      type: 'bar',
      data: salesData,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `$${context.raw.toFixed(2)}`;
              }
            }
          }
        }
      }
    });

    const lowStockItems = getItems().filter(item => item.quantity < 5);
    const lowStockList = document.getElementById('low-stock-list');
    
    if (lowStockItems.length === 0) {
      lowStockList.innerHTML = '<li>No low stock items</li>';
    } else {
      lowStockList.innerHTML = lowStockItems.map(item => 
        `<li>${item.name} (${item.quantity} remaining at ${item.location})</li>`
      ).join('');
    }
  }
}

// Initialize dashboard if on dashboard page
if (window.location.pathname.includes('dashboard.html')) {
  document.addEventListener('DOMContentLoaded', initDashboard);
}

// Initialize the view items page
if (window.location.pathname.includes('view-items.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    renderItems();
  });
}
