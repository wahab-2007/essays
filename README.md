# essays

- [Ranked drafts and recommendations](ranked-essays/)
- [Essay Library source](site/)

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
