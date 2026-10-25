const fileInput = document.getElementById("fileInput");
const photoGrid = document.getElementById("photoGrid");
const albumsSection = document.getElementById("albumsSection");
const createAlbumBtn = document.getElementById("createAlbumBtn");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const heading = document.getElementById("heading");
const count = document.getElementById("count");
const themeBtn = document.getElementById("themeBtn");

let photos = [];
let currentView = "gallery";
let albums = JSON.parse(
  localStorage.getItem("harshGalleryAlbums") || "[]"
);
let nextId = 1;
let db;

const viewNames = {
  gallery: "All Photos",
  albums: "Albums",
  favorites: "Favorites",
  trash: "Recently Deleted"
};

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("HarshGalleryDB", 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("photos")) {
        database.createObjectStore("photos", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function savePhoto(photo) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    transaction.objectStore("photos").put(photo);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function loadPhotos() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("photos", "readonly");
    const request = transaction.objectStore("photos").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removeSavedPhoto(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    transaction.objectStore("photos").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function startApp() {
  try {
    db = await openDatabase();
    photos = await loadPhotos();
    nextId = photos.reduce((max, photo) => Math.max(max, photo.id), 0) + 1;
    renderPhotos();
  } catch (error) {
    alert("Storage start nahi ho paya. Chrome mein page dobara open karke try karo.");
    console.error(error);
  }
}

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files || []);

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    const photo = {
      id: nextId++,
      name: file.name,
      blob: file,
      date: Date.now(),
      favorite: false,
      deleted: false
    };

    await savePhoto(photo);
    photos.push(photo);
  }

  fileInput.value = "";
  renderPhotos();
});

createAlbumBtn.addEventListener("click", () => {
  const name = prompt("Apne album ka naam likho:");

  if (!name || !name.trim()) return;

  const albumName = name.trim();

  const alreadyExists = albums.some(
    album => album.name.toLowerCase() === albumName.toLowerCase()
  );

  if (alreadyExists) {
    alert("Is naam ka album pehle se bana hua hai.");
    return;
  }

  albums.push({
    id: Date.now(),
    name: albumName,
    photoIds: []
  });

  localStorage.setItem(
    "harshGalleryAlbums",
    JSON.stringify(albums)
  );

  alert("Album save ho gaya! Ab agle step mein use screen par dikhayenge.");
});
document.querySelectorAll(".toolbar button").forEach(button => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    const showAlbums = currentView === "albums";
    if (showAlbums) {
  renderAlbums();
}

albumsSection.hidden = !showAlbums;
createAlbumBtn.hidden = !showAlbums;
photoGrid.hidden = showAlbums;

    document.querySelectorAll(".toolbar button")
      .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");
    renderPhotos();
  });
});

searchInput.addEventListener("input", renderPhotos);
sortSelect.addEventListener("change", renderPhotos);

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeBtn.textContent = document.body.classList.contains("dark")
    ? "☀️ Light Mode"
    : "🌙 Dark Mode";
});

function makeButton(label, className, action) {
  const button = document.createElement("button");
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", action);
  return button;
}

async function updatePhoto(photo) {
  await savePhoto(photo);
  renderPhotos();
}

function renderAlbums() {
  albumsSection.replaceChildren();

  if (albums.length === 0) {
    const message = document.createElement("p");
    message.className = "empty";
    message.textContent = "Abhi koi album nahi hai. + Create Album par click karo!";
    albumsSection.appendChild(message);
    return;
  }

  albums.forEach(album => {
    const card = document.createElement("article");
    card.className = "photo-card";

    const info = document.createElement("div");
    info.className = "photo-info";

    const name = document.createElement("p");
    name.className = "photo-name";
    name.textContent = "📁 " + album.name;
    name.style.cursor = "pointer";

name.addEventListener("click", () => {
  const albumPhotos = photos.filter(
    photo =>
      album.photoIds.includes(photo.id) &&
      !photo.deleted
  );

  albumsSection.hidden = true;
  const backBtn = document.createElement("button");
backBtn.textContent = "← Back to Albums";
backBtn.className = "secondary";

backBtn.addEventListener("click", () => {
  albumsSection.hidden = false;
  photoGrid.hidden = true;
  createAlbumBtn.hidden = false;

  backBtn.remove();
  renderAlbums();
});

photoGrid.before(backBtn);
  photoGrid.hidden = false;
  createAlbumBtn.hidden = true;

  photoGrid.replaceChildren();

  if (albumPhotos.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Is album mein abhi koi photo nahi hai.";
    photoGrid.appendChild(message);
    return;
  }

  albumPhotos.forEach(photo => {
    const image = document.createElement("img");
    image.src = URL.createObjectURL(photo.blob);
    image.alt = photo.name;
    image.style.cursor = "pointer";

image.addEventListener("click", () => {
  const previewUrl = URL.createObjectURL(photo.blob);
  const previewWindow = window.open("", "_blank");

  if (previewWindow) {
    previewWindow.document.write(`
      <title>${photo.name}</title>
      <body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;">
        <img src="${previewUrl}" style="max-width:100%;max-height:100%;object-fit:contain;">
      </body>
    `);
  } else {
    alert("Browser mein pop-ups allow karo.");
  }
});
    image.style.width = "100%";
    image.style.maxWidth = "250px";
    image.style.objectFit = "contain";

    photoGrid.appendChild(image);
  });
});
    const addToAlbumBtn = makeButton(
  "＋ Add Photos",
  "secondary",
  () => {
    const availablePhotos = photos.filter(photo => !photo.deleted);

    if (availablePhotos.length === 0) {
      alert("Pehle All Photos mein photos add karo.");
      return;
    }

    const choices = availablePhotos
      .map(photo => `${photo.id}: ${photo.name}`)
      .join("\n");

    const answer = prompt(
      "Album mein add karne ke liye photo ID likho:\n\n" +
      choices +
      "\n\nEk se zyada photos ke liye ID comma se likho."
    );

    if (!answer) return;

    const selectedIds = answer
      .split(",")
      .map(value => Number(value.trim()))
      .filter(id => availablePhotos.some(photo => photo.id === id));

    album.photoIds = [...new Set([...album.photoIds, ...selectedIds])];

    localStorage.setItem(
      "harshGalleryAlbums",
      JSON.stringify(albums)
    );

    total.textContent = `${album.photoIds.length} photos`;
    alert("Photos album mein add ho gayi!");
  }
);

info.appendChild(addToAlbumBtn);

    const total = document.createElement("p");
    total.textContent = `${album.photoIds.length} photos`;

    info.append(name, total);
    const deleteAlbumBtn = makeButton(
  "🗑️ Delete Album",
  "danger",
  () => {
    const confirmDelete = confirm(
      `Kya tum "${album.name}" album delete karna chahte ho? Photos All Photos mein safe rahengi.`
    );

    if (!confirmDelete) return;

    albums = albums.filter(
      item => item.id !== album.id
    );

    localStorage.setItem(
      "harshGalleryAlbums",
      JSON.stringify(albums)
    );

    renderAlbums();
    alert("Album delete ho gaya!");
  }
);

info.appendChild(deleteAlbumBtn);
    const renameAlbumBtn = makeButton(
  "✏️ Rename Album",
  "secondary",
  () => {
    const newName = prompt(
      "Album ka naya naam likho:",
      album.name
    );

    if (!newName || !newName.trim()) return;

    const cleanName = newName.trim();

    const alreadyExists = albums.some(
      item =>
        item.id !== album.id &&
        item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (alreadyExists) {
      alert("Is naam ka album pehle se hai.");
      return;
    }

    album.name = cleanName;

    localStorage.setItem(
      "harshGalleryAlbums",
      JSON.stringify(albums)
    );

    renderAlbums();
    alert("Album ka naam change ho gaya!");
  }
);

info.appendChild(renameAlbumBtn);
    const removeFromAlbumBtn = makeButton(
  "Remove Photo",
  "secondary",
  () => {
    if (album.photoIds.length === 0) {
      alert("Is album mein koi photo nahi hai.");
      return;
    }

    const answer = prompt(
      "Remove karne ke liye photo ID likho:\n" +
      photos
        .filter(photo =>
          album.photoIds.includes(photo.id) &&
          !photo.deleted
        )
        .map(photo => `${photo.id}: ${photo.name}`)
        .join("\n")
    );

    if (!answer) return;

    const id = Number(answer.trim());

    if (!album.photoIds.includes(id)) {
      alert("Galat photo ID!");
      return;
    }

    album.photoIds = album.photoIds.filter(
      photoId => photoId !== id
    );

    localStorage.setItem(
      "harshGalleryAlbums",
      JSON.stringify(albums)
    );

    renderAlbums();
    alert("Photo album se remove ho gayi. All Photos mein safe hai.");
  }
);

info.appendChild(removeFromAlbumBtn);
    card.appendChild(info);
    albumsSection.appendChild(card);
  });
}
function renderPhotos() {
  photoGrid.replaceChildren();
  heading.textContent = viewNames[currentView];

  let visiblePhotos = photos.filter(photo => {
    if (currentView === "trash") return photo.deleted;
    if (photo.deleted) return false;
    if (currentView === "favorites") return photo.favorite;
    return true;
  });

  const search = searchInput.value.trim().toLowerCase();

  visiblePhotos = visiblePhotos.filter(photo =>
    photo.name.toLowerCase().includes(search)
  );

  if (sortSelect.value === "newest") {
    visiblePhotos.sort((a, b) => b.date - a.date);
  } else if (sortSelect.value === "oldest") {
    visiblePhotos.sort((a, b) => a.date - b.date);
  } else {
    visiblePhotos.sort((a, b) => a.name.localeCompare(b.name));
  }

  count.textContent = `${visiblePhotos.length} photo(s)`;

  if (!visiblePhotos.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = currentView === "trash"
      ? "Recently Deleted is empty."
      : "No photos here yet. Click + Add Photos to begin!";
    photoGrid.appendChild(empty);
    return;
  }

  visiblePhotos.forEach(photo => {
    const card = document.createElement("article");
    card.className = "photo-card";

    const image = document.createElement("img");
    image.src = URL.createObjectURL(photo.blob);
    image.alt = photo.name;
    image.style.cursor = "pointer";

image.addEventListener("click", () => {
  const previewUrl = URL.createObjectURL(photo.blob);
  const previewWindow = window.open("", "_blank");

  if (previewWindow) {
    previewWindow.document.write(`
      <title>${photo.name}</title>
      <body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;">
        <img src="${previewUrl}" style="max-width:100%;max-height:100%;object-fit:contain;">
      </body>
    `);
  } else {
    URL.revokeObjectURL(previewUrl);
    alert("Photo kholne ke liye browser mein pop-ups allow karo.");
  }
});
    image.loading = "lazy";
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });

    const info = document.createElement("div");
    info.className = "photo-info";

    const name = document.createElement("p");
    name.className = "photo-name";
    name.textContent = photo.name;

    const actions = document.createElement("div");
    actions.className = "photo-actions";

    if (photo.deleted) {
      actions.appendChild(makeButton("↩ Restore", "secondary", async () => {
        photo.deleted = false;
        await updatePhoto(photo);
      }));

      actions.appendChild(makeButton("Delete Forever", "danger", async () => {
        if (confirm("Is photo ko Harsh Gallery se permanently remove karna hai?")) {
          await removeSavedPhoto(photo.id);
          photos = photos.filter(item => item.id !== photo.id);
          renderPhotos();
        }
      }));
    } else {
      actions.appendChild(makeButton(
        photo.favorite ? "❤️ Favorited" : "🤍 Favorite",
        "secondary",
        async () => {
          photo.favorite = !photo.favorite;
          await updatePhoto(photo);
        }
      ));

      actions.appendChild(makeButton("🗑 Delete", "danger", async () => {
        photo.deleted = true;
        await updatePhoto(photo);
      }));

      actions.appendChild(makeButton("ℹ Details", "secondary", () => {
        alert(`Name: ${photo.name}\nAdded: ${new Date(photo.date).toLocaleString()}`);
      }));

      actions.appendChild(makeButton("↗ Share", "secondary", async () => {
        try {
          if (navigator.share) {
            await navigator.share({
              title: photo.name,
              text: "Shared from Harsh Gallery"
            });
          } else {
            alert("Sharing is not supported in this browser.");
          }
        } catch (error) {
          if (error.name !== "AbortError") alert("Unable to share this photo.");
        }
      }));

      actions.appendChild(makeButton("✏ Rename", "secondary", async () => {
        const newName = prompt("Enter a new photo name:", photo.name);
        if (newName && newName.trim()) {
          photo.name = newName.trim();
          await updatePhoto(photo);
        }
      }));
    }

    info.append(name, actions);
    card.append(image, info);
    photoGrid.appendChild(card);
  });
}

document.querySelector('[data-view="gallery"]').classList.add("active");
startApp();