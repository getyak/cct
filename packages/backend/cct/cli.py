import argparse, uvicorn

def main():
    p = argparse.ArgumentParser(description="Claude Conversation Tracker")
    sub = p.add_subparsers(dest="cmd")
    srv = sub.add_parser("serve", help="Start the API server")
    srv.add_argument("--host", default="127.0.0.1")
    srv.add_argument("--port", type=int, default=8787)
    srv.add_argument("--reload", action="store_true")
    args = p.parse_args()
    if args.cmd == "serve":
        uvicorn.run("cct.main:app", host=args.host, port=args.port, reload=args.reload)
    else:
        p.print_help()

if __name__ == "__main__":
    main()
