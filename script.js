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

// Compute how many cartons of a given (adjusted) size fit, given an available
// container length. Returns the quantities for the three loading steps plus the
// length actually consumed by this size.
// Consumed length = (L x Lines) + (W x flat Lines rest length)  <-- matches the
// sequential length-packing rule requested for the Loading Summary.
function computeFit(adjLength, adjWidth, adjHeight, availLength, container) {
  // Each normal-orientation carton occupies (carton Length + Extra Length/bulging)
  // along the container length; each flat-oriented carton faces its carton Length
  // towards the container width/height, so the length bulge is also added there.
  const normalLengthPerCarton = adjLength;

  const perLength = Math.floor(availLength / normalLengthPerCarton);
  const perWidth = Math.floor(container.width / adjWidth);
  const perHeight = Math.floor(container.height / adjHeight);
  const qty1 = perLength * perWidth * perHeight;

  const remainingLength = availLength - perLength * normalLengthPerCarton;
  // Flat cartons laid in the remaining length strip have their WIDTH facing the
  // container length, so each one occupies (carton Width + Extra Width/bulging).
  const flatLengthPerCarton = adjWidth;
  const flatPerLength = Math.floor(remainingLength / flatLengthPerCarton);
  const flatPerWidth = Math.floor(container.width / normalLengthPerCarton);
  const flatPerHeight = perHeight;
  const qty2 = flatPerLength * flatPerWidth * flatPerHeight;

  const remainingHeight = container.height - perHeight * adjHeight;
  const flatPerHeightLength = Math.floor(availLength / normalLengthPerCarton);
  const flatPerHeightWidth = Math.floor(container.width / adjHeight);
  const flatPerHeightHeight = Math.floor(remainingHeight / adjWidth);
  const qty3 = flatPerHeightLength * flatPerHeightWidth * flatPerHeightHeight;

  const qtyFit = qty1 + qty2 + qty3;
  const lengthUsed = perLength * normalLengthPerCarton + flatPerLength * flatLengthPerCarton;

  return {
    perLength, flatPerLength, perWidth, perHeight, flatPerWidth, flatPerHeight,
    flatPerHeightLength, flatPerHeightWidth, flatPerHeightHeight,
    qty1, qty2, qty3, qtyFit, lengthUsed,
  };
}

// Given an available container length and a target quantity, return the actual
// length (in mm) needed to pack that many cartons of this size, following the
// same three-step layout as computeFit. This lets the sequential packing free up
// space for the next size when a carton is ordered in fewer numbers than it could
// maximally hold (e.g. order 2000 of a size that could fit 3366).
function lengthForQty(adjLength, adjWidth, adjHeight, availLength, container, qty) {
  if (qty <= 0) return 0;

  const normalLengthPerCarton = adjLength; // Length + Extra Length (bulging)
  const perWidth = Math.floor(container.width / adjWidth);
  const perHeight = Math.floor(container.height / adjHeight);
  const normalLayer = perWidth * perHeight;
  const perLength = Math.floor(availLength / normalLengthPerCarton);
  const normalMax = perLength * normalLayer;

  if (qty <= normalMax) {
    return Math.ceil(qty / normalLayer) * normalLengthPerCarton;
  }

  let lengthUsed = perLength * normalLengthPerCarton;
  let remaining = availLength - lengthUsed;
  let qtyLeft = qty - normalMax;

  const flatPerWidth = Math.floor(container.width / normalLengthPerCarton);
  const flatPerHeight = perHeight;
  const flatLayer2 = flatPerWidth * flatPerHeight;
  const flatLengthPerCarton = adjWidth; // Width + Extra Width (bulging)
  const flatPerLength = Math.floor(remaining / flatLengthPerCarton);
  const flatMax2 = flatPerLength * flatLayer2;

  if (qtyLeft <= flatMax2) {
    return lengthUsed + Math.ceil(qtyLeft / flatLayer2) * flatLengthPerCarton;
  }

  lengthUsed += flatPerLength * flatLengthPerCarton;
  remaining = availLength - lengthUsed;
  qtyLeft -= flatMax2;

  const flatPerHeightLength = Math.floor(availLength / normalLengthPerCarton);
  const flatPerHeightWidth = Math.floor(container.width / adjHeight);
  const flatPerHeightHeight = Math.floor((container.height - perHeight * adjHeight) / adjWidth);
  const flatLayer3 = flatPerHeightLength * flatPerHeightWidth;
  const flatMax3 = flatPerHeightHeight * flatLayer3;

  if (qtyLeft <= flatMax3) {
    return lengthUsed + Math.ceil(qtyLeft / flatLayer3) * adjLength;
  }

  return availLength;
}

// Decompose a target quantity into the same three loading steps as computeFit,
// so we can show the user a concrete loading plan for the actual ordered qty
// (not just the theoretical maximum). Returns the per-step counts and the
// actual length consumed by that many cartons.
function fitForQty(adjLength, adjWidth, adjHeight, availLength, container, qty) {
  const normalLengthPerCarton = adjLength; // Length + Extra Length (bulging)
  const perWidth = Math.floor(container.width / adjWidth);
  const perHeight = Math.floor(container.height / adjHeight);
  const normalLayer = perWidth * perHeight;
  const perLength = Math.floor(availLength / normalLengthPerCarton);
  const normalMax = perLength * normalLayer;

  let qty1 = 0, usedLines = 0;
  if (qty > 0) {
    usedLines = Math.min(perLength, Math.ceil(qty / normalLayer));
    qty1 = Math.min(qty, usedLines * normalLayer);
  }
  let lengthUsed = usedLines * normalLengthPerCarton;
  let remaining = availLength - lengthUsed;
  let qtyLeft = qty - qty1;

  const flatPerWidth = Math.floor(container.width / normalLengthPerCarton);
  const flatPerHeight = perHeight;
  const flatLayer2 = flatPerWidth * flatPerHeight;
  const flatLengthPerCarton = adjWidth; // Width + Extra Width (bulging)
  const flatPerLength = Math.floor(remaining / flatLengthPerCarton);
  let qty2 = 0, usedFlatLines = 0;
  if (qtyLeft > 0 && flatPerLength > 0) {
    usedFlatLines = Math.min(flatPerLength, Math.ceil(qtyLeft / flatLayer2));
    qty2 = Math.min(qtyLeft, usedFlatLines * flatLayer2);
  }
  lengthUsed += usedFlatLines * flatLengthPerCarton;
  remaining = availLength - lengthUsed;
  qtyLeft -= qty2;

  const flatPerHeightLength = Math.floor(availLength / normalLengthPerCarton);
  const flatPerHeightWidth = Math.floor(container.width / adjHeight);
  const flatPerHeightHeight = Math.floor((container.height - perHeight * adjHeight) / adjWidth);
  const flatLayer3 = flatPerHeightLength * flatPerHeightWidth;
  let qty3 = 0;
  if (qtyLeft > 0 && flatPerHeightHeight > 0) {
    qty3 = Math.min(qtyLeft, Math.min(flatPerHeightHeight, Math.ceil(qtyLeft / flatLayer3)) * flatLayer3);
  }

  return {
    perLength: usedLines, flatPerLength: usedFlatLines,
    perWidth, perHeight, flatPerWidth, flatPerHeight,
    flatPerHeightLength, flatPerHeightWidth, flatPerHeightHeight,
    qty1, qty2, qty3, qtyFit: qty1 + qty2 + qty3, lengthUsed,
  };
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

      const fit = computeFit(adjLength, adjWidth, adjHeight, container.length, container);
      const perLength = fit.perLength;
      const perWidth = fit.perWidth;
      const perHeight = fit.perHeight;
      const qty1 = fit.qty1;
      const flatPerLength = fit.flatPerLength;
      const flatPerWidth = fit.flatPerWidth;
      const flatPerHeight = fit.flatPerHeight;
      const qty2 = fit.qty2;
      const flatPerHeightLength = fit.flatPerHeightLength;
      const flatPerHeightWidth = fit.flatPerHeightWidth;
      const flatPerHeightHeight = fit.flatPerHeightHeight;
      const qty3 = fit.qty3;
      const totalFit = fit.qtyFit;

      const actualLoadQty = Math.min(orderQty, totalFit);
      const cartonCbm = (adjLength * adjWidth * adjHeight) / 1000000000;
      const utilizedCbm = cartonCbm * actualLoadQty;

      const reduced = orderQty > totalFit;

      cartonSummaryRows.push({
        label: `Size ${index + 1}: ${cartonLength}\u00d7${cartonWidth}\u00d7${cartonHeight} mm`,
        orderQty: orderQty,
        cbmPerCarton: cartonCbm,
        totalFit: totalFit,
        adjLength: adjLength,
        adjWidth: adjWidth,
        adjHeight: adjHeight,
      });

      totalUtilizedCbm += utilizedCbm;
      totalCartonQty += actualLoadQty;

      const planQty = Math.min(orderQty, totalFit);
      const plan = fitForQty(adjLength, adjWidth, adjHeight, container.length, container, planQty);

      detailsHTML += `
        <div class="loading-details">
          <h3>Carton Size ${index + 1} Details</h3>
          <p>Carton Size dimensions are:<br>L = ${cartonLength} mm, W = ${cartonWidth} mm, H = ${cartonHeight} mm</p>

          <div class="detail-split">
            <div class="detail-panel">
              <h4 class="panel-title">Maximum fit (full container)</h4>

              <div class="td">
                <p class="fc">Loading qty without flat: ${qty1} Boxes</p>
                <p>Number of Lines: ${perLength}</p>
                <p>Number of rows horizontally: ${perWidth}</p>
                <p>Number of rows vertically: ${perHeight}</p>
              </div>

              <div class="td1">
                <p class="fc">Flat loading qty rest of the length: ${qty2} Boxes</p>
                <p>Number of flat Lines rest length: ${flatPerLength}</p>
                <p>Number of flat rows horizontally: ${flatPerWidth}</p>
                <p>Number of flat rows vertically: ${flatPerHeight}</p>
              </div>

              <div class="td2">
                <p class="fc">Flat loading qty rest of the height: ${qty3} Boxes</p>
                <p>Number of flat Lines rest height: ${flatPerHeightLength}</p>
                <p>Number of flat rows horizontally: ${flatPerHeightWidth}</p>
                <p>Number of flat rows vertically: ${flatPerHeightHeight}</p>
              </div>

              <p class="fc2"><b>Total Loading Qty with flat: ${totalFit} Boxes</b></p>
              <p>Utilized CBM: ${utilizedCbm.toFixed(2)} CBM</p>
              <p>Empty CBM: ${(container.capacity - utilizedCbm).toFixed(2)} CBM</p>
            </div>

            <div class="detail-panel">
              <h4 class="panel-title">Loading plan for ${planQty} Boxes${reduced ? ` <small style="color:#f39c12;">(Order: ${orderQty})</small>` : ''}</h4>

              <div class="td">
                <p class="fc">Loading qty without flat: ${plan.qty1} Boxes</p>
                <p>Number of Lines: ${plan.perLength}</p>
                <p>Number of rows horizontally: ${plan.perWidth}</p>
                <p>Number of rows vertically: ${plan.perHeight}</p>
              </div>

              <div class="td1">
                <p class="fc">Flat loading qty rest of the length: ${plan.qty2} Boxes</p>
                <p>Number of flat Lines rest length: ${plan.flatPerLength}</p>
                <p>Number of flat rows horizontally: ${plan.flatPerWidth}</p>
                <p>Number of flat rows vertically: ${plan.flatPerHeight}</p>
              </div>

              <div class="td2">
                <p class="fc">Flat loading qty rest of the height: ${plan.qty3} Boxes</p>
                <p>Number of flat Lines rest height: ${plan.flatPerHeightLength}</p>
                <p>Number of flat rows horizontally: ${plan.flatPerHeightWidth}</p>
                <p>Number of flat rows vertically: ${plan.flatPerHeightHeight}</p>
              </div>

              <p class="fc2"><b>Total Loading Qty: ${plan.qtyFit} Boxes</b></p>
              <p>Length consumed: ${plan.lengthUsed.toFixed(0)} mm</p>
              <p>Utilized CBM: ${(planQty * cartonCbm).toFixed(2)} CBM</p>
              <p>Free length after this size: ${(container.length - plan.lengthUsed).toFixed(0)} mm</p>
            </div>
          </div>
        </div>
      `;
    }
  });

  document.getElementById("totalCartonQty").textContent = totalCartonQty;
  document.getElementById("totalUtilizedCbm").textContent = totalUtilizedCbm.toFixed(2);
  document.getElementById("totalEmptyCbm").textContent = (containerData[type].capacity - totalUtilizedCbm).toFixed(2);

  // ---- Sequential length-based packing for the Loading Summary ----
  // Carton sizes are loaded one after another along the container length.
  // Length consumed by a size = (L x Lines) + (W x flat Lines rest length).
  // The remaining length is passed to the next size. This is the only part
  // affected by the new rule (Carton Size Details above stays unchanged).
  let availLength = container.length;
  const seqResults = cartonSummaryRows.map((row) => {
    const fit = computeFit(row.adjLength, row.adjWidth, row.adjHeight, availLength, container);
    const seqLoaded = Math.min(row.orderQty, fit.qtyFit);
    // Consume only the length actually needed for the loaded quantity, so a
    // partially-ordered size does not block the remaining space from the next size.
    const lengthUsed = lengthForQty(row.adjLength, row.adjWidth, row.adjHeight, availLength, container, seqLoaded);
    availLength = Math.max(0, availLength - lengthUsed);
    return Object.assign({}, row, { fit: fit, seqLoaded: seqLoaded, lengthUsed: lengthUsed });
  });
  const finalRemainingLength = availLength;
  const freeCbm = (finalRemainingLength * container.width * container.height) / 1000000000;

  const summaryTotalCartons = seqResults.reduce((s, r) => s + r.seqLoaded, 0);
  const summaryUtilizedCbm = seqResults.reduce((s, r) => s + r.seqLoaded * r.cbmPerCarton, 0);

  let summaryBodyHTML = "";
  const emptyCbm = containerData[type].capacity - summaryUtilizedCbm;
  const exceedsCapacity = summaryUtilizedCbm > containerData[type].capacity;
  seqResults.forEach((row) => {
    const reduced = row.orderQty > row.seqLoaded;
    const perCartonCbm = row.cbmPerCarton;
    // Qty to Fill = how many more of THIS size fit inside the final remaining
    // container length (the free space left after all sizes were packed).
    let fillQtyNum = 0;
    if (perCartonCbm > 0 && finalRemainingLength > 0) {
      const f = computeFit(row.adjLength, row.adjWidth, row.adjHeight, finalRemainingLength, container);
      fillQtyNum = f.qtyFit;
    }
    const fillQty = fillQtyNum > 0 ? `+${fillQtyNum}` : '0';
    const balanceToLoad = Math.max(0, Math.ceil(row.orderQty - row.seqLoaded));
    const proposedLoadQty = row.seqLoaded + fillQtyNum;
    summaryBodyHTML += `
      <tr>
        <td>${row.label}</td>
        <td>${perCartonCbm.toFixed(4)}</td>
        <td>${row.seqLoaded}${reduced ? `<br><small style="color: #f39c12;">Order: ${row.orderQty}</small>` : ''}</td>
        <td>${balanceToLoad}</td>
        <td>${(row.seqLoaded * perCartonCbm).toFixed(2)} m\u00b3</td>
        <td>${fillQty}</td>
        <td>${proposedLoadQty}</td>
      </tr>`;
  });
  const totalBalance = seqResults.reduce(
    (sum, row) => sum + Math.max(0, Math.ceil(row.orderQty - row.seqLoaded)),
    0
  );
  const summaryFooterHTML = `
    <tr style="font-weight: bold; background: rgba(52, 152, 219, 0.2);">
      <td colspan="2">Total</td>
      <td>${summaryTotalCartons}</td>
      <td>${totalBalance}</td>
      <td>${summaryUtilizedCbm.toFixed(2)} m\u00b3</td>
      <td></td>
      <td></td>
    </tr>
    <tr style="font-weight: bold; background: rgba(231, 76, 60, 0.15);">
      <td colspan="6">Total Empty CBM:</td>
      <td style="${exceedsCapacity ? 'color: #e74c3c; font-weight: bold;' : ''}">${emptyCbm.toFixed(2)} m\u00b3</td>
    </tr>`;
  document.getElementById("loadingSummaryBody").innerHTML = summaryBodyHTML;
  document.getElementById("loadingSummaryFooter").innerHTML = summaryFooterHTML;

  const existingFreeNote = document.getElementById("freeLengthNote");
  if (existingFreeNote) existingFreeNote.remove();
  const freeNote = document.createElement("div");
  freeNote.id = "freeLengthNote";
  freeNote.style.cssText = "margin-top: 10px; padding: 10px 15px; background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.4); border-radius: 8px; font-size: 0.95rem;";
  freeNote.innerHTML = `<i class="fas fa-ruler-horizontal" style="color: #2ecc71; margin-right: 8px;"></i>
    <b>Remaining free container length:</b> ${finalRemainingLength.toFixed(0)} mm &nbsp;&rarr;&nbsp; <b>Free volume:</b> ${freeCbm.toFixed(2)} m\u00b3
    <br><small>This is the length left after sequentially packing every carton size along the container length. It can still be used by additional sizes.</small>`;
  document.getElementById("loadingSummary").appendChild(freeNote);

  const existingProposal = document.getElementById("balanceProposal");
  if (existingProposal) existingProposal.remove();

  if (totalBalance > 0) {
    let proposalRows = "";
    seqResults.forEach((row) => {
      const balance = Math.max(0, Math.ceil(row.orderQty - row.seqLoaded));
      if (balance <= 0) return;
      const perContainer = row.totalFit;
      const containersNeeded = Math.ceil(balance / perContainer);
      const lastContainerLoad = balance % perContainer === 0 ? perContainer : balance % perContainer;
      const containerFull = row.seqLoaded >= row.totalFit;
      proposalRows += `
        <tr>
          <td>${row.label}</td>
          <td>${balance}</td>
          <td>${perContainer}</td>
          <td>${containersNeeded}</td>
          <td>${perContainer} (last: ${lastContainerLoad})</td>
        </tr>`;
    });

    if (proposalRows) {
      const proposalDiv = document.createElement("div");
      proposalDiv.id = "balanceProposal";
      proposalDiv.style.cssText = "background: rgba(155, 89, 182, 0.15); border: 2px solid #9b59b6; border-radius: 10px; padding: 15px; margin-top: 15px;";
      proposalDiv.innerHTML = `
        <h3 style="color: #9b59b6; margin-top: 0;">
          <i class="fas fa-lightbulb"></i> Proposal for Remaining Order (Balance to Load)
        </h3>
        <p style="margin-bottom: 10px;">
          The current container is physically <b>full</b> for the loaded carton size(s).
          The "Qty to Fill" is <b>0</b> because the remaining empty space (CBM) cannot fit
          even one more carton of this size in any orientation. The unfulfilled balance below
          must be loaded into <b>additional container(s)</b>.
        </p>
        <table class="info-table">
          <thead>
            <tr>
              <th>Carton Size</th>
              <th>Balance to Load</th>
              <th>Max Fit / Container</th>
              <th>Containers Needed</th>
              <th>Load per Container</th>
            </tr>
          </thead>
          <tbody>${proposalRows}</tbody>
        </table>`;
      document.getElementById("loadingSummary").appendChild(proposalDiv);
    }
  }

  if (exceedsCapacity) {
    const warningHTML = `
      <div style="background: rgba(231, 76, 60, 0.2); border: 2px solid #e74c3c; border-radius: 10px; padding: 15px; margin-top: 15px; text-align: center;">
        <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 1.5rem; margin-right: 10px;"></i>
        <span style="color: #e74c3c; font-weight: bold; font-size: 1.1rem;">
          Warning: Planned loading quantity (${summaryUtilizedCbm.toFixed(2)} m\u00b3) exceeds container capacity (${containerData[type].capacity} m\u00b3) by ${Math.abs(emptyCbm).toFixed(2)} m\u00b3!
        </span>
      </div>`;
    const existingWarning = document.getElementById("capacityWarning");
    if (existingWarning) existingWarning.remove();
    const warningDiv = document.createElement("div");
    warningDiv.id = "capacityWarning";
    warningDiv.innerHTML = warningHTML;

    // Find best single size to reduce
    const excessCbm = Math.abs(emptyCbm);
    let bestSize = null;
    let bestRemove = Infinity;
    seqResults.forEach((row) => {
      const perCartonCbm = row.cbmPerCarton;
      if (perCartonCbm > 0) {
        const toRemove = Math.ceil(excessCbm / perCartonCbm);
        if (toRemove < bestRemove) {
          bestRemove = toRemove;
          bestSize = row;
        }
      }
    });

    if (bestSize && bestRemove > 0) {
      const tipDiv = document.createElement("div");
      tipDiv.id = "singleSizeTip";
      tipDiv.style.cssText = "background: rgba(243, 156, 18, 0.2); border: 2px solid #f39c12; border-radius: 10px; padding: 15px; margin-top: 10px; text-align: center;";
      tipDiv.innerHTML = `
        <i class="fas fa-lightbulb" style="color: #f39c12; font-size: 1.3rem; margin-right: 8px;"></i>
        <span style="color: #f39c12; font-weight: bold;">
          Tip: Reduce <b>${bestSize.label}</b> by <b>${bestRemove}</b> cartons to fit the container with a single size adjustment.
        </span>`;
      document.getElementById("loadingSummary").appendChild(tipDiv);
    }

    document.getElementById("loadingSummary").appendChild(warningDiv);
  } else {
    const existingWarning = document.getElementById("capacityWarning");
    if (existingWarning) existingWarning.remove();
    const existingTip = document.getElementById("singleSizeTip");
    if (existingTip) existingTip.remove();
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
  const summaryUtilizationPercent = Math.min(100, (summaryUtilizedCbm / containerData[type].capacity) * 100).toFixed(1);
  document.getElementById("utilizationPercent").textContent = summaryUtilizationPercent + "%";
  document.getElementById("efficiencyFill").style.width = summaryUtilizationPercent + "%";
  document.getElementById("efficiencyText").textContent = summaryUtilizationPercent + "%";
  document.getElementById("totalCartonsLoaded").textContent = summaryTotalCartons;
  document.getElementById("emptySpaceValue").textContent = (containerData[type].capacity - summaryUtilizedCbm).toFixed(2) + " m\u00b3";
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
