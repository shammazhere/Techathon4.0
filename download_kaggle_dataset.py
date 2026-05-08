import kagglehub
import os

path = kagglehub.dataset_download(
    "fantineh/next-day-wildfire-spread"
)

print("Dataset path:", path)
print("\nFiles and folders:")
for item in os.listdir(path):
    full_path = os.path.join(path, item)
    if os.path.isdir(full_path):
        print(f"  📁 {item}/")
        # List contents of subdirectories
        try:
            subfiles = os.listdir(full_path)
            for subitem in subfiles[:10]:  # Limit to first 10
                print(f"      - {subitem}")
            if len(subfiles) > 10:
                print(f"      ... and {len(subfiles) - 10} more files")
        except:
            pass
    else:
        size_mb = os.path.getsize(full_path) / (1024*1024)
        print(f"  📄 {item} ({size_mb:.1f} MB)")
