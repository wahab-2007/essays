# essays

- [Ranked drafts and recommendations](ranked-essays/)
- [Essay Library source](site/)

## Use the library

Start with a suggested draft or browse by topic. Each draft opens with its main point, a worked example and a trade-off. Use **Compare** to weigh two drafts side by side, or open **Full essay** and jump to the section you need. You can save drafts in your browser and use **Saved drafts only** to narrow your decision.

## Publish the library

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. Then run **Deploy essay library** from the Actions tab. Future pushes to main rebuild the site. GitHub displays the published address in the deployment summary.

The site includes the 35 essays and their slide decks. Check the Pages visibility in Settings before enabling publication.

## Preview locally

With Python and LibreOffice Impress installed, run these commands from the repository root.

```sh
python3 site/build.py /tmp/essay-library
python3 -m http.server 8000 --bind 127.0.0.1 --directory /tmp/essay-library
```

Open http://localhost:8000 to browse the library.
