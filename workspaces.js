'use strict';
/*jshint esversion: 8, browser: true, devel: true, strict: global */
/*globals chrome */

const isDebug = true;
const debug = isDebug ? console.log : () => {};

// TODO
// Renaming to an existing name check
// Autocomplete save workspace name (case insensitive)
// Search Tabs (autocomplete)
// Context menu right click to add workspace
// Listen to tab close but ignore on window close
// Use calc for max-width & max-height with ems
// Multiple JS files / Function Sections
// Privacy statement
// set window name to workspace - https://bugs.chromium.org/p/chromium/issues/detail?id=1190160
// Preferances:
// - urls
//     - ignore duplicates in workspaces
//     - ignore duplicates across workspaces (maintain what is alrady saved)
//     - chrome://
//     - update tab title on merge
// - Storage Local/Sync/File
// - Multiple storage options
// - Import/Export from file

switchView("mainView");
onElementChange("editWorkspaceName", handleEditNameChange);
onElementClick("editDeleteButton", handleEditDelete);
onElementClick("editCancelButton", handleEditCancel);
onElementClick("editUpdateButton", handleEditUpdate);
onElementClick("saveWorkspaceButton", handleSaveWorkspace);
onElementChange("workspaceName", handleNameChange);
onElementClick("cancelButton", handleCancel);
onElementClick("saveButton", handleSave);
onElementClick("cancelConfirmButton", handleCancelConfirm);
onElementClick("confirmReplaceButton", handleReplaceConfirm);
onElementClick("confirmMergeButton", handleMergeConfirm);
renderWorkspacesList();

async function renderWorkspacesList() {
    const fragment = document.createDocumentFragment();
    const workspaces = await getWorkspaces();
    if (workspaces.length > 0) {
        workspaces.forEach(workspace => {
            const viewButton = document.createElement("button");
            viewButton.setAttribute("class", "viewWorkspace");
            viewButton.textContent = workspace;
            viewButton.addEventListener("click", function () {
                openWorkspace(workspace);
            });
            fragment.appendChild(viewButton);
            const editButton = document.createElement("button");
            editButton.setAttribute("class", "editWorkspace");
            editButton.addEventListener("click", function () {
                editWorkspace(workspace);
            });
            const svg = document.createElement("img");
            svg.setAttribute("class", "editWorkspaceImage");
            svg.setAttribute("src", "icons/pen-to-square.svg");
            editButton.appendChild(svg);
            fragment.appendChild(editButton);
            const flexBreak = document.createElement("div");
            flexBreak.setAttribute("class", "flexRowsBreak");
            fragment.appendChild(flexBreak);
        });
    } else {
        const message = document.createElement("span");
        message.setAttribute("class", "noWorkspaces");
        message.innerHTML = "You don't have any saved workspaces. You can create one below.";
        fragment.appendChild(message);
    }
    const workspacesDiv = document.getElementById("workspaces");
    while (workspacesDiv.firstChild) {
        workspacesDiv.removeChild(workspacesDiv.firstChild);
    }
    workspacesDiv.appendChild(fragment);
}

async function getWorkspaces() {
    //FIXME other browser support
    const data = await chrome.storage.local.get(null);
    const workspaces = Object.keys(data);
    debug("Workspaces:\n", workspaces);
    return workspaces;
}

async function openWorkspace(workspace) {
    debug("Opening", workspace);
    const tabs = await getWorkspaceTabs(workspace);
    const urls = tabs.map(tab => tab.url);
    //FIXME other browser support
    chrome.windows.create( {
        focused: true,
        url: urls
    });
}

async function getWorkspaceTabs(workspace) {
    //FIXME other browser support
    let tabs = await chrome.storage.local.get(workspace);
    if (Object.keys(tabs).length != 1) {
        debug("Invalid return from storage get. Got:\n",workspace);
        return [];
    }
    tabs = tabs[workspace];
    debug("Tabs for", workspace ,":\n", tabs);
    return tabs;
}

function editWorkspace(workspace) {
    setElement("editWorkspaceName", workspace);
    setElement("editOriginalName", workspace);
    renderEditTabsList(workspace);
    switchView("editView");
}

async function renderEditTabsList(workspace) {
    const fragment = document.createDocumentFragment();
    const tabs = await getWorkspaceTabs(workspace);
    tabs.forEach((tab, i)  => {
        const checkbox = document.createElement("input");
        checkbox.setAttribute("id", "tab"+i);  
        checkbox.setAttribute("class", "editTabCheckbox"); 
        checkbox.setAttribute("type", "checkbox");
        checkbox.setAttribute("checked", "checked");
        checkbox.setAttribute("value", tab.url);
        fragment.appendChild(checkbox);
        const label = document.createElement("label");
        label.setAttribute("for", "tab"+i);
        label.setAttribute("class", "editTabLabel");
        if (tab.title !== "") {
            label.innerText = tab.title;
            label.setAttribute("title", tab.url);
        } else {
            label.innerText = tab.url;
        }
        fragment.appendChild(label);
        const flexBreak = document.createElement("div");
        flexBreak.setAttribute("class", "flexRowsBreak");
        fragment.appendChild(flexBreak);
    });
    const editTabsDiv = document.getElementById("editTabs");
    while (editTabsDiv.firstChild) {
        editTabsDiv.removeChild(editTabsDiv.firstChild);
    }
    editTabsDiv.appendChild(fragment);
}

function handleEditNameChange() {
    enableElement("editUpdateButton", getElement("editWorkspaceName") !== "");
}

async function handleEditDelete() {
    const workspaceName = getElement("editOriginalName");
    //FIXME other browser support
    await chrome.storage.local.remove(workspaceName);
    renderWorkspacesList();
    switchView("mainView");
}

function handleEditCancel() {
    switchView("mainView");
}

async function handleEditUpdate() {
    const oldWorkspaceName = getElement("editOriginalName");
    const newWorkspaceName = getElement("editWorkspaceName");
    let windowTabs = await getWorkspaceTabs(oldWorkspaceName);

    const editTabs = document.getElementById("editTabs");
    const editTabsChildren = editTabs.children;
    debug("Edit Tab Nodes", editTabsChildren);
    for (let i = 0; i < editTabsChildren.length; i++) {
        const child = editTabsChildren[i];
        if (child.tagName === "INPUT" && !child.checked) {
            const removedUrl = child.getAttribute("value");
            windowTabs = windowTabs.filter(tab => {
                debug("Testing", tab.title);
                const result = tab.url !== removedUrl;
                if (!result) {
                    debug("Removing", tab.title);
                }
                return result;
            });
        }
    }
    debug("Filtered Tabs", windowTabs);
    let workspaceObj = {};
    workspaceObj[newWorkspaceName] = windowTabs;

    //FIXME other browser support
    await chrome.storage.local.set(workspaceObj);

    if (oldWorkspaceName !== newWorkspaceName) {
        //FIXME other browser support
        await chrome.storage.local.remove(oldWorkspaceName);
        renderWorkspacesList();
    }
    switchView("mainView");
}

function handleSaveWorkspace() {
    switchView("saveView");
    setElement("workspaceName", "");
    focusElement("workspaceName");
    enableElement("saveButton", false);
}

function handleNameChange() {
    enableElement("saveButton", getElement("workspaceName") !== "");
}

function handleCancel() {
    switchView("mainView");
}

async function handleSave() {
    const newWorkspace = getElement("workspaceName");

    let found = await findExistingWorkspace(newWorkspace);

    if (found !== "") {
        const confirmText = "A workspace already exists called "+found+".";
        setElementText("confirmText", confirmText);
        switchView("confirmView");
    } else {
        await createWorkspace(newWorkspace);
    }
}

async function findExistingWorkspace(newWorkspace) {
    const newWorkspaceLower = newWorkspace.toLowerCase();
    const existingWorkspaces = await getWorkspaces();
    for (let i in existingWorkspaces) {
        if (existingWorkspaces[i].toLocaleLowerCase() === newWorkspaceLower) {
            return existingWorkspaces[i];
        }
    }
    return "";
}


function handleCancelConfirm() {
    switchView("saveView");
}

async function handleReplaceConfirm() {
    const newWorkspace = getElement("workspaceName");
    let found = await findExistingWorkspace(newWorkspace);
    createWorkspace(newWorkspace);
}

async function handleMergeConfirm() {
    const newWorkspace = getElement("workspaceName");
    let found = await findExistingWorkspace(newWorkspace);
    await mergeWorkspace(newWorkspace);
}

async function createWorkspace(workspace) {
    const windowTabs = await getWindowTabs();
    await storeWorkspace(workspace, windowTabs);
}

async function mergeWorkspace(workspace) {
    let newWorkspaceTabs = await getWorkspaceTabs(workspace);
    const windowTabs = await getWindowTabs();
    windowTabs.forEach(windowTab => {
        if (!newWorkspaceTabs.includes(windowTab)) {
            newWorkspaceTabs.push(windowTab);
        }
    });
    await storeWorkspace(workspace, newWorkspaceTabs);
}

async function storeWorkspace(workspace, windowTabs) {
    if (windowTabs.length == 0) {
        //FIXME other browser support
        await chrome.storage.local.remove(workspace);
    } else {
        let workspaceObj = {};
        workspaceObj[workspace] = windowTabs;
        //FIXME other browser support
        await chrome.storage.local.set(workspaceObj);
    }

    const currentWindow = await chrome.windows.getCurrent();
    if (!isDebug) {
        //FIXME other browser support
        chrome.windows.remove(currentWindow.id);
    } else {
        renderWorkspacesList();
        switchView("mainView");
    }
}

function switchView(showView) {
    const views = ["mainView", "editView", "saveView", "confirmView"];
    views.forEach(view => {
        showElement(view, view === showView);
    });
}

async function getWindowTabs() {
    let queryOptions = { currentWindow: true, pinned: false };
    //FIXME other browser support
    const tabs = await chrome.tabs.query(queryOptions);
    const filteredTabs = tabs.filter(tab => !tab.url.startsWith("chrome://"));
    debug("Filtered tabs\n", filteredTabs);
    const cleanedTabs = filteredTabs.map(tab => ({title: tab.title, url: tab.url}));
    debug("Current window tabs:\n", cleanedTabs);
    return cleanedTabs;
}

function showElement(id, show) {
    const element = document.getElementById(id);
    if (element !== null) {
        element.style.display = show ? "flex" : "none";
    } else {
        debug("Could not show/hide element", id);
    }
}

function enableElement(id, enable) {
    const element = document.getElementById(id);
    if (element !== null) {
        element.disabled = !enable;
    } else {
        debug("Could not enable/disable element", id);
    }
}

function focusElement(id) {
    const element = document.getElementById(id);
    if (element !== null) {
        element.focus();
    } else {
        debug("Could not give focus to element", id);
    }
}

function getElement(id) {
    const element = document.getElementById(id);
    if (element !== null) {
        return element.value;
    } else {
        debug("Could not set value of element", id);
        return "";
    }
}

function setElement(id, value) {
    const element = document.getElementById(id);
    if (element !== null) {
        element.value = value;
    } else {
        debug("Could not set value of element", id);
    }
}

function setElementText(id, text) {
    const element = document.getElementById(id);
    if (element !== null) {
        element.innerHTML = text;
    } else {
        debug("Could not set text of element", id);
    }
}

function onElementClick(id, func) {
    const element = document.getElementById(id);
    if (element !== null) {
        element.addEventListener("click", func);
    } else {
        debug("Could not add click handler for element", id);
    }
}

function onElementChange(id, func) {
    const element = document.getElementById(id);
    if (element !== null) {
        element.addEventListener("keyup", func);
    } else {
        debug("Could not add onchange handler for element", id);
    }  
}