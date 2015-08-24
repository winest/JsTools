@set @_PackJsInBatByWinest=0 /*
@ECHO OFF
CD /D "%~dp0"
CSCRIPT "%~0" //D //Nologo //E:JScript %1 %2 %3 %4 %5 %6 %7 %8 %9
IF %ERRORLEVEL% LSS 0 ( ECHO Failed. Error code is %ERRORLEVEL% )
PAUSE
EXIT /B
*/

var WshFileSystem = new ActiveXObject( "Scripting.FileSystemObject" );
var WshShell = WScript.CreateObject( "WScript.Shell" );
function LoadJs( aJsPath )
{
    var file = WshFileSystem.OpenTextFile( aJsPath , 1 );
    var strContent = file.ReadAll();
    file.Close();
    return strContent;
}
eval( LoadJs( "..\\..\\..\\_Include\\CWUtils\\JScript\\Windows\\CWFile.js" ) );
eval( LoadJs( "..\\..\\..\\_Include\\CWUtils\\JScript\\Windows\\CWStd.js" ) );
eval( LoadJs( "..\\..\\..\\_Include\\CWUtils\\JScript\\Windows\\CWShell.js" ) );
eval( LoadJs( "RelocateJsInclude.js" ) );


var strLogFolder = WshShell.CurrentDirectory + "\\Log";
CleanLogFolder();

for ( ;; )
{
    WScript.Echo( "\n\n\n========== RelocateJsInclude by winest ==========\n" );
    WScript.Echo( "What would you like to do?\n" +
                  "1. Relocate the path in eval() in all *.js and *.bat\n" +
                  "2. Leave" );
    var strChoice = WScript.StdIn.ReadLine();
    switch ( strChoice )
    {        
        case "1" :
        {
            //Arg1: the old folder in the source file that need to be updated
            //Arg2: the new fodler that will replace the old folder (if files are found under the new folder)
            //Arg3: an array of old filenames that are renamed now in your new project
            //Arg4: an array of current filenames now in your new project
            //Replace <Arg1>\\123.js to <Arg2>\\123.js if <Arg2>\\123.js exists
            //Replace <Arg1>\\<Arg3> to <Arg2>\\<Arg4> if both <Arg1>\\<Arg3> and <Arg2>\\<Arg4> exist
            var aryFolderMap = [ new stFileMap( /.*(Utils|CWUtils\\\\Windows)$/ , "F:\\Code\\_Include\\CWUtils\\JScript\\Windows" ,
                                                ["MyGeneralUtils.js","MyFile.js","MyMath.js","MyShell.js","MyStd.js","MyCrypto.js","MyXmlHttp.js"] ,
                                                ["CWGeneralUtils.js","CWFile.js","CWMath.js","CWShell.js","CWStd.js","CWCrypto.js","CWXmlHttp.js"] ) 
                               ];
            var strFolder = CWUtils.SelectFolder( "Please select the folder where *.js or *.bat exists. All *.js and *.bat files will be updated" );
            if ( true == CWUtils.SelectYesNo( "Update *.js and *.bat files under \"" + strFolder + "\"? (y/n)" ) )
            {
                TraverseAndRelocateJsInclude( strFolder , aryFolderMap , strLogFolder );
            }
            break;
        }
        case "2" :
        {
            if ( true == CWUtils.SelectYesNo( "Are you going to leave? (y/n)" ) )
            {
                WScript.Echo( "Successfully End" );
                WScript.Quit( 0 );
            }
            break;
        }
        default :
        {
            WScript.Echo( "Unknown choice: " + strChoice );
            break;
        }
    }
}


function CleanLogFolder()
{
    if ( WshFileSystem.FolderExists(strLogFolder) )
    {
        var folder = WshFileSystem.GetFolder( strLogFolder );

        var enumFolder = new Enumerator( folder.SubFolders );
        for ( ; ! enumFolder.atEnd() ; enumFolder.moveNext() )
        {
            WshFileSystem.DeleteFolder( enumFolder.item().Path , true );
        }
        var enumFile = new Enumerator( folder.Files );
        for ( ; ! enumFile.atEnd() ; enumFile.moveNext() )
        {
            WshFileSystem.DeleteFile( enumFile.item().Path , true );
        }
    }
}
