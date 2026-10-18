import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/jetbrains-mono";
import "./app.css";
import "./visuals/diagram.css";
import { mount } from "svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
