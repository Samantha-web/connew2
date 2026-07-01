// Container data
const containerData = {
  20: {
    name: "20ft Standard",
    length: 5898,
    width: 2352,
    height: 2393,
    capacity: 33.2,
    maxLoad: "21,770",
  },
  40: {
    name: "40ft Standard",
    length: 12032,
    width: 2352,
    height: 2393,
    capacity: 67.7,
    maxLoad: "26,780",
  },
  "40hc": {
    name: "40ft High Cube",
    length: 12032,
    width: 2352,
    height: 2698,
    capacity: 76.4,
    maxLoad: "30,480",
  },
  "45hc": {
    name: "45ft High Cube",
    length: 13544,
    width: 2352,
    height: 2698,
    capacity: 86.0,
    maxLoad: "32,500",
  },
};

// Tab switching functionality
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabId = button.getAttribute("data-tab");

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => (content.style.display = "none"));
    document.getElementById(tabId).style.display = "block";
    button.classList.add("active");

    if (tabId === "calculator") {
      updateContainerDetails();
    }
  });
});

function updateContainerDetails() {
  const type = document.getElementById("containerType").value;
  const container = containerData[type];

  document.getElementById("internalLength").textContent = container.length + " mm";
  document.getElementById("internalWidth").textContent = container.width + " mm";
  document.getElementById("internalHeight").textContent = container.height + " mm";
  document.getElementById("capacity").textContent = container.capacity + " m³";
  document.getElementById("maxLoad").textContent = container.maxLoad + " kg";
}

function addRow() {
  const table = document.querySelector("#cartonTable tbody");
  const rowCount = table.rows.length;
  const newRow = table.insertRow();

  newRow.innerHTML = `
        <td>${rowCount + 1}</td>
        <td>
          <input type="number" min="0" class="carton-length form-control" placeholder="Enter length">
        </td>
        <td>
          <input type="number" min="0" class="carton-width form-control" placeholder="Enter width">
        </td>
        <td>
          <input type="number" min="0" class="carton-height form-control" placeholder="Enter height">
        </td>
        <td>
          <input type="number" min="0" class="order-qty form-control" placeholder="Enter quantity">
        </td>
        <td><input type="number" min="0" class="bulging-length form-control" value="0"></td>
        <td><input type="number" min="0" class="bulging-width form-control" value="12"></td>
        <td><input type="number" min="0" class="bulging-height form-control" value="3"></td>
        <td><button type="button" class="btn btn-secondary" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button></td>
      `;
}

function deleteRow(btn) {
  const row = btn.parentNode.parentNode;
  const table = document.querySelector("#cartonTable tbody");

  if (table.rows.length > 1) {
    row.parentNode.removeChild(row);

    const rows = table.querySelectorAll("tr");
    rows.forEach((row, index) => {
      row.cells[0].textContent = index + 1;
    });
  } else {
    alert("You need at least one carton size");
  }
}

function calculateLoading() {
  const type = document.getElementById("containerType").value;
  const container = containerData[type];
  const rows = document.querySelectorAll("#cartonTable tbody tr");
  let totalUtilizedCbm = 0;
  let totalCartonQty = 0;
  let detailsHTML = "";

  document.getElementById("loadingSummary").style.display = "none";
  document.getElementById("containerDetails").innerHTML = "";

  const cartonSummaryRows = [];

  rows.forEach((row, index) => {
    const cartonLength = parseFloat(row.querySelector(".carton-length").value) || 0;
    const cartonWidth = parseFloat(row.querySelector(".carton-width").value) || 0;
    const cartonHeight = parseFloat(row.querySelector(".carton-height").value) || 0;
    const orderQty = parseFloat(row.querySelector(".order-qty").value) || 0;
    const bulgingLength = parseFloat(row.querySelector(".bulging-length").value) || 0;
    const bulgingWidth = parseFloat(row.querySelector(".bulging-width").value) || 0;
    const bulgingHeight = parseFloat(row.querySelector(".bulging-height").value) || 0;

    if (cartonLength && cartonWidth && cartonHeight && orderQty) {
      const adjLength = cartonLength + bulgingLength;
      const adjWidth = cartonWidth + bulgingWidth;
      const adjHeight = cartonHeight + bulgingHeight;

      const perLength = Math.floor(container.length / adjLength);
      const perWidth = Math.floor(container.width / adjWidth);
      const perHeight = Math.floor(container.height / adjHeight);
      const qty1 = perLength * perWidth * perHeight;

      const remainingLength = container.length - perLength * adjLength;
      const flatPerLength = Math.floor(remainingLength / adjWidth);
      const flatPerWidth = Math.floor(container.width / adjLength);
      const flatPerHeight = perHeight;
      const qty2 = flatPerLength * flatPerWidth * flatPerHeight;

      const remainingHeight = container.height - perHeight * adjHeight;
      const flatPerHeightLength = Math.floor(container.length / adjLength);
      const flatPerHeightWidth = Math.floor(container.width / adjHeight);
      const flatPerHeightHeight = Math.floor(remainingHeight / adjWidth);
      const qty3 = flatPerHeightLength * flatPerHeightWidth * flatPerHeightHeight;

      const totalFit = qty1 + qty2 + qty3;

      const cartonCbm = (adjLength * adjWidth * adjHeight) / 1000000000;
      const utilizedCbm = cartonCbm * orderQty;

      cartonSummaryRows.push({
        label: `Size ${index + 1}: ${cartonLength}\u00d7${cartonWidth}\u00d7${cartonHeight} mm`,
        qty: orderQty,
        cbm: utilizedCbm,
      });

      totalUtilizedCbm += utilizedCbm;
      totalCartonQty += orderQty;

      detailsHTML += `
        <div class="loading-details">
          <h3>Carton Size ${index + 1} Details</h3>
          <p>Carton Size dimensions are:<br>L = ${cartonLength} mm, W = ${cartonWidth} mm, H = ${cartonHeight} mm</p>

          <div class="td">
            <p class="fc">Loading qty without flat: ${qty1} Boxes</p>
            <p>Number of columns: ${perLength}</p>
            <p>Number of rows horizontally: ${perWidth}</p>
            <p>Number of rows vertically: ${perHeight}</p>
          </div>

          <div class="td1">
            <p class="fc">Flat loading qty rest of the length: ${qty2} Boxes</p>
            <p>Number of flat columns rest length: ${flatPerLength}</p>
            <p>Number of flat rows horizontally: ${flatPerWidth}</p>
            <p>Number of flat rows vertically: ${flatPerHeight}</p>
          </div>

          <div class="td2">
            <p class="fc">Flat loading qty rest of the height: ${qty3} Boxes</p>
            <p>Number of flat columns rest height: ${flatPerHeightLength}</p>
            <p>Number of flat rows horizontally: ${flatPerHeightWidth}</p>
            <p>Number of flat rows vertically: ${flatPerHeightHeight}</p>
          </div>

          <p class="fc2"><b>Total Loading Qty with flat: ${totalFit} Boxes</b></p>

          <p>Utilized CBM: ${utilizedCbm.toFixed(2)} CBM</p>
          <p>Empty CBM: ${(container.capacity - utilizedCbm).toFixed(2)} CBM</p>
        </div>
      `;
    }
  });

  document.getElementById("totalCartonQty").textContent = totalCartonQty;
  document.getElementById("totalUtilizedCbm").textContent = totalUtilizedCbm.toFixed(2);
  document.getElementById("totalEmptyCbm").textContent = (containerData[type].capacity - totalUtilizedCbm).toFixed(2);

  let summaryBodyHTML = "";
  cartonSummaryRows.forEach((row) => {
    summaryBodyHTML += `
      <tr>
        <td>${row.label}</td>
        <td>${row.qty}</td>
        <td>${row.cbm.toFixed(2)} m\u00b3</td>
      </tr>`;
  });
  const emptyCbm = containerData[type].capacity - totalUtilizedCbm;
  const exceedsCapacity = totalUtilizedCbm > containerData[type].capacity;
  const summaryFooterHTML = `
    <tr style="font-weight: bold; background: rgba(52, 152, 219, 0.2);">
      <td>Total</td>
      <td>${totalCartonQty}</td>
      <td>${totalUtilizedCbm.toFixed(2)} m\u00b3</td>
    </tr>
    <tr style="font-weight: bold; background: rgba(231, 76, 60, 0.15);">
      <td colspan="2">Total Empty CBM:</td>
      <td style="${exceedsCapacity ? 'color: #e74c3c; font-weight: bold;' : ''}">${emptyCbm.toFixed(2)} m\u00b3</td>
    </tr>`;
  document.getElementById("loadingSummaryBody").innerHTML = summaryBodyHTML;
  document.getElementById("loadingSummaryFooter").innerHTML = summaryFooterHTML;

  if (exceedsCapacity) {
    const warningHTML = `
      <div style="background: rgba(231, 76, 60, 0.2); border: 2px solid #e74c3c; border-radius: 10px; padding: 15px; margin-top: 15px; text-align: center;">
        <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 1.5rem; margin-right: 10px;"></i>
        <span style="color: #e74c3c; font-weight: bold; font-size: 1.1rem;">
          Warning: Planned loading quantity (${totalUtilizedCbm.toFixed(2)} m\u00b3) exceeds container capacity (${containerData[type].capacity} m\u00b3) by ${Math.abs(emptyCbm).toFixed(2)} m\u00b3!
        </span>
      </div>`;
    const existingWarning = document.getElementById("capacityWarning");
    if (existingWarning) existingWarning.remove();
    const warningDiv = document.createElement("div");
    warningDiv.id = "capacityWarning";
    warningDiv.innerHTML = warningHTML;
    document.getElementById("loadingSummary").appendChild(warningDiv);
  } else {
    const existingWarning = document.getElementById("capacityWarning");
    if (existingWarning) existingWarning.remove();
  }

  const utilizationPercent = Math.min(100, (totalUtilizedCbm / containerData[type].capacity) * 100).toFixed(1);
  const containerDetailsHTML = `
    <div class="card">
      <h2 class="card-title"><i class="fas fa-chart-bar"></i> Loading Results for ${containerData[type].name}</h2>

      <div class="summary-grid">
        <div class="summary-item">
          <strong>Container Volume:</strong>
          <span>${containerData[type].capacity} m\u00b3</span>
        </div>
        <div class="summary-item">
          <strong>Utilized Volume:</strong>
          <span>${totalUtilizedCbm.toFixed(2)} m\u00b3</span>
        </div>
        <div class="summary-item">
          <strong>Empty Space:</strong>
          <span>${(containerData[type].capacity - totalUtilizedCbm).toFixed(2)} m\u00b3</span>
        </div>
        <div class="summary-item">
          <strong>Space Utilization:</strong>
          <span>${utilizationPercent}%</span>
        </div>
      </div>

      ${detailsHTML}
    </div>
  `;

  document.getElementById("containerDetails").innerHTML = containerDetailsHTML;

  document.getElementById("loadingSummary").style.display = "block";
  document.getElementById("utilizationPercent").textContent = utilizationPercent + "%";
  document.getElementById("efficiencyFill").style.width = utilizationPercent + "%";
  document.getElementById("efficiencyText").textContent = utilizationPercent + "%";
  document.getElementById("totalCartonsLoaded").textContent = totalCartonQty;
  document.getElementById("emptySpaceValue").textContent = (containerData[type].capacity - totalUtilizedCbm).toFixed(2) + " m\u00b3";
}

function clearData() {
  document.getElementById("containerType").value = "20";
  updateContainerDetails();

  const table = document.querySelector("#cartonTable tbody");
  table.innerHTML = "";

  table.innerHTML = `
    <tr>
      <td>1</td>
      <td>
        <input type="number" min="0" class="carton-length form-control" placeholder="Enter length">
      </td>
      <td>
        <input type="number" min="0" class="carton-width form-control" placeholder="Enter width">
      </td>
      <td>
        <input type="number" min="0" class="carton-height form-control" placeholder="Enter height">
      </td>
      <td>
        <input type="number" min="0" class="order-qty form-control" placeholder="Enter quantity">
      </td>
      <td><input type="number" min="0" class="bulging-length form-control" value="0"></td>
      <td><input type="number" min="0" class="bulging-width form-control" value="12"></td>
      <td><input type="number" min="0" class="bulging-height form-control" value="3"></td>
      <td><button type="button" class="btn btn-secondary" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button></td>
    </tr>
  `;

  document.getElementById("totalCartonQty").textContent = "0";
  document.getElementById("totalUtilizedCbm").textContent = "0.00";
  document.getElementById("totalEmptyCbm").textContent = "0.00";
  document.getElementById("containerDetails").innerHTML = "";
  document.getElementById("loadingSummary").style.display = "none";
  document.getElementById("loadingSummaryBody").innerHTML = "";
  document.getElementById("loadingSummaryFooter").innerHTML = "";
}

document.addEventListener("DOMContentLoaded", function () {
  updateContainerDetails();

  document.querySelector('[data-tab="calculator"]').addEventListener("click", function () {
    document.querySelector('[data-tab="calculator"]').click();
  });
});
